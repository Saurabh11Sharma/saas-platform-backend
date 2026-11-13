import assert from 'node:assert/strict';

const gatewayPort = Number(process.env.GATEWAY_HOST_PORT ?? 4000);
const services = [
  { name: 'identity', port: Number(process.env.IDENTITY_HOST_PORT ?? 4101) },
  { name: 'tenant', port: Number(process.env.TENANT_HOST_PORT ?? 4102) },
  { name: 'project', port: Number(process.env.PROJECT_HOST_PORT ?? 4103) },
  { name: 'billing', port: Number(process.env.BILLING_HOST_PORT ?? 4104) },
];

async function waitForJson(url, description, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'No response received';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (!response.ok) {
        throw new Error(`${description} returned HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`${description} did not become ready: ${lastError}`);
}

async function main() {
  for (const service of services) {
    const body = await waitForJson(
      `http://127.0.0.1:${service.port}/api/v1/health/ready`,
      `${service.name} readiness endpoint`,
    );
    assert.equal(body.service, service.name);
    assert.equal(body.status, 'ready');
    console.log(`PASS ${service.name}: container readiness endpoint responded`);
  }

  const gateway = await waitForJson(
    `http://127.0.0.1:${gatewayPort}/api/v1/health/ready`,
    'API Gateway readiness endpoint',
  );
  assert.equal(gateway.service, 'api-gateway');
  assert.equal(gateway.status, 'ready');
  console.log('PASS api-gateway: container readiness endpoint responded');

  const aggregate = await waitForJson(
    `http://127.0.0.1:${gatewayPort}/api/v1/platform/health`,
    'API Gateway aggregate health endpoint',
  );

  assert.equal(aggregate.gateway, 'ok');
  assert.ok(['ok', 'degraded'].includes(aggregate.status));
  assert.ok(Number.isFinite(Date.parse(aggregate.checkedAt)));

  const byName = new Map(aggregate.services.map((service) => [service.name, service]));
  for (const service of services) {
    assert.equal(
      byName.get(service.name)?.status,
      'ok',
      `Gateway did not report ${service.name} as healthy`,
    );
  }

  assert.ok(
    aggregate.services.every((service) => !Object.hasOwn(service, 'url')),
    'Gateway aggregate response must not expose internal service URLs',
  );

  console.log('PASS api-gateway: aggregate health sees all four implemented services as healthy');
  console.log('NOTE notification and audit are intentionally not containerized until their services exist');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
