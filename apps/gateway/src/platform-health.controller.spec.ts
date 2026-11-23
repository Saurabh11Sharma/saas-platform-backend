import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PlatformHealthController } from './platform-health.controller';

const servicesByPort = new Map([
  ['4101', 'identity'],
  ['4102', 'tenant'],
  ['4103', 'project'],
  ['4104', 'billing'],
  ['4105', 'notification'],
  ['4106', 'audit'],
]);

function readyResponse(input: Parameters<typeof fetch>[0]): Response {
  const service = servicesByPort.get(new URL(String(input)).port);
  assert.ok(service);

  return new Response(JSON.stringify({ service, status: 'ready' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('PlatformHealthController', () => {
  it('reports contract-compliant services without exposing their internal URLs', async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    const successfulFetch: typeof fetch = async (input, init) => {
      requestedUrls.push(String(input));
      assert.ok(init?.signal);
      return readyResponse(input);
    };

    globalThis.fetch = successfulFetch;

    try {
      const result = await new PlatformHealthController().getPlatformHealth();

      assert.equal(result.gateway, 'ok');
      assert.equal(result.status, 'ok');
      assert.equal(Number.isNaN(Date.parse(result.checkedAt)), false);
      assert.deepEqual(
        result.services.map((service) => service.name),
        ['identity', 'tenant', 'project', 'billing', 'notification', 'audit'],
      );
      assert.ok(result.services.every((service) => service.status === 'ok'));
      assert.ok(result.services.every((service) => !('url' in service)));
      assert.equal(requestedUrls.length, 6);
      assert.ok(requestedUrls.every((url) => url.endsWith('/api/v1/health/ready')));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('marks non-success responses and network failures as unavailable', async () => {
    const originalFetch = globalThis.fetch;

    const mixedFetch: typeof fetch = async (input) => {
      const url = String(input);

      if (url.includes('localhost:4101')) {
        return new Response(null, { status: 503 });
      }

      if (url.includes('localhost:4102')) {
        throw new Error('connection refused');
      }

      return readyResponse(input);
    };

    globalThis.fetch = mixedFetch;

    try {
      const result = await new PlatformHealthController().getPlatformHealth();

      assert.equal(result.status, 'degraded');
      assert.equal(
        result.services.find((service) => service.name === 'identity')?.status,
        'unavailable',
      );
      assert.equal(
        result.services.find((service) => service.name === 'tenant')?.status,
        'unavailable',
      );
      assert.ok(
        result.services
          .filter((service) => !['identity', 'tenant'].includes(service.name))
          .every((service) => service.status === 'ok'),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects successful responses that do not satisfy the versioned readiness contract', async () => {
    const originalFetch = globalThis.fetch;

    const contractFetch: typeof fetch = async (input) => {
      const port = new URL(String(input)).port;

      if (port === '4101') {
        return new Response(JSON.stringify({ service: 'tenant', status: 'ready' }), {
          status: 200,
        });
      }

      if (port === '4102') {
        return new Response(JSON.stringify({ service: 'tenant', status: 'starting' }), {
          status: 200,
        });
      }

      if (port === '4103') {
        return new Response('not-json', { status: 200 });
      }

      if (port === '4104') {
        return new Response(null, { status: 204 });
      }

      return readyResponse(input);
    };

    globalThis.fetch = contractFetch;

    try {
      const result = await new PlatformHealthController().getPlatformHealth();

      assert.equal(result.status, 'degraded');
      for (const serviceName of ['identity', 'tenant', 'project', 'billing']) {
        assert.equal(
          result.services.find((service) => service.name === serviceName)?.status,
          'unavailable',
        );
      }
      assert.ok(
        result.services
          .filter((service) => ['notification', 'audit'].includes(service.name))
          .every((service) => service.status === 'ok'),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles a downstream timeout without stalling aggregation', async () => {
    const originalFetch = globalThis.fetch;
    let identitySignal: AbortSignal | undefined;

    const timeoutFetch: typeof fetch = async (input, init) => {
      if (String(input).includes('localhost:4101')) {
        const signal = init?.signal;
        assert.ok(signal instanceof AbortSignal);
        identitySignal = signal;

        return await new Promise<Response>((_resolve, reject) => {
          const fallback = setTimeout(() => {
            reject(new Error('Identity health check did not abort'));
          }, 2_000);

          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(fallback);
              reject(signal.reason);
            },
            { once: true },
          );
        });
      }

      return readyResponse(input);
    };

    globalThis.fetch = timeoutFetch;

    try {
      const startedAt = Date.now();
      const result = await new PlatformHealthController().getPlatformHealth();

      assert.equal(identitySignal?.aborted, true);
      assert.ok(Date.now() - startedAt < 2_000);
      assert.equal(result.status, 'degraded');
      assert.equal(
        result.services.find((service) => service.name === 'identity')?.status,
        'unavailable',
      );
      assert.ok(
        result.services
          .filter((service) => service.name !== 'identity')
          .every((service) => service.status === 'ok'),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
