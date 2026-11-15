import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PlatformHealthController } from './platform-health.controller';

describe('PlatformHealthController', () => {
  it('reports healthy services without exposing their internal URLs', async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    const successfulFetch: typeof fetch = async (input, init) => {
      requestedUrls.push(String(input));
      assert.ok(init?.signal);
      return new Response(null, { status: 204 });
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

      return new Response(null, { status: 204 });
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
  it('marks a timed-out downstream health check unavailable without stalling aggregation', async () => {
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

      return new Response(null, { status: 204 });
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
