import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const services = [
  {
    name: 'identity',
    entry: 'apps/services/identity/dist/main.js',
    port: 4101,
    portVariable: 'IDENTITY_PORT',
  },
  {
    name: 'tenant',
    entry: 'apps/services/tenant/dist/main.js',
    port: 4102,
    portVariable: 'TENANT_PORT',
  },
  {
    name: 'project',
    entry: 'apps/services/project/dist/main.js',
    port: 4103,
    portVariable: 'PROJECT_PORT',
  },
  {
    name: 'billing',
    entry: 'apps/services/billing/dist/main.js',
    port: 4104,
    portVariable: 'BILLING_PORT',
  },
];

const running = [];

function startApplication(application) {
  const child = spawn(process.execPath, [application.entry], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      [application.portVariable]: String(application.port),
      ...application.environment,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  const appendOutput = (chunk) => {
    output = (output + chunk.toString()).slice(-8_000);
  };

  child.stdout.on('data', appendOutput);
  child.stderr.on('data', appendOutput);

  const instance = { ...application, child, get output() { return output; } };
  running.push(instance);
  return instance;
}

async function waitForReady(application) {
  const url = `http://127.0.0.1:${application.port}/api/v1/health/ready`;
  const deadline = Date.now() + 30_000;
  let lastError = 'No response received';

  while (Date.now() < deadline) {
    if (application.child.exitCode !== null || application.child.signalCode !== null) {
      throw new Error(
        `${application.name} exited before becoming ready. Output:\n${application.output}`,
      );
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      assert.equal(response.status, 200, `${application.name} readiness endpoint returned HTTP ${response.status}`);

      const body = await response.json();
      assert.equal(body.service, application.name);
      assert.equal(body.status, 'ready');
      assert.ok(Number.isFinite(Date.parse(body.timestamp)));

      console.log(`PASS ${application.name}: readiness endpoint responded`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await delay(500);
    }
  }

  throw new Error(
    `${application.name} did not become ready within 30 seconds. Last error: ${lastError}\nOutput:\n${application.output}`,
  );
}

async function stopApplication(application) {
  const { child } = application;
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = once(child, 'exit').catch(() => undefined);
  child.kill('SIGTERM');

  await Promise.race([exited, delay(5_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
}

async function main() {
  try {
    for (const service of services) {
      const application = startApplication(service);
      await waitForReady(application);
    }

    const gateway = startApplication({
      name: 'api-gateway',
      entry: 'apps/gateway/dist/main.js',
      port: 4000,
      portVariable: 'GATEWAY_PORT',
      environment: {
        IDENTITY_URL: 'http://127.0.0.1:4101',
        TENANT_URL: 'http://127.0.0.1:4102',
        PROJECT_URL: 'http://127.0.0.1:4103',
        BILLING_URL: 'http://127.0.0.1:4104',
      },
    });
    await waitForReady(gateway);

    const aggregateResponse = await fetch('http://127.0.0.1:4000/api/v1/platform/health', {
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(aggregateResponse.status, 200);

    const aggregate = await aggregateResponse.json();
    assert.equal(aggregate.gateway, 'ok');
    assert.ok(['ok', 'degraded'].includes(aggregate.status));
    assert.ok(Number.isFinite(Date.parse(aggregate.checkedAt)));
    assert.ok(Array.isArray(aggregate.services));

    const serviceStatuses = new Map(
      aggregate.services.map((service) => [service.name, service]),
    );

    for (const service of services) {
      assert.equal(
        serviceStatuses.get(service.name)?.status,
        'ok',
        `Gateway did not report ${service.name} as healthy`,
      );
    }

    assert.ok(
      aggregate.services.every((service) => !Object.hasOwn(service, 'url')),
      'Gateway health response must not expose internal service URLs',
    );

    console.log('PASS api-gateway: aggregate health reports all implemented services as healthy');
  } finally {
    await Promise.all(running.reverse().map(stopApplication));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
