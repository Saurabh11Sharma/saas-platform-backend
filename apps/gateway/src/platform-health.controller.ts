import { Controller, Get } from '@nestjs/common';

const targets = [
  { name: 'identity', url: process.env.IDENTITY_URL ?? 'http://localhost:4101' },
  { name: 'tenant', url: process.env.TENANT_URL ?? 'http://localhost:4102' },
  { name: 'project', url: process.env.PROJECT_URL ?? 'http://localhost:4103' },
  { name: 'billing', url: process.env.BILLING_URL ?? 'http://localhost:4104' },
  { name: 'notification', url: process.env.NOTIFICATION_URL ?? 'http://localhost:4105' },
  { name: 'audit', url: process.env.AUDIT_URL ?? 'http://localhost:4106' },
];

@Controller('platform')
export class PlatformHealthController {
  @Get('health')
  async getPlatformHealth() {
    const services = await Promise.all(
      targets.map(async (target) => {
        const url = target.url + '/api/v1/health/ready';

        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(1500),
          });

          return {
            name: target.name,
            status: response.ok ? 'ok' : 'unavailable',
          };
        } catch {
          return { name: target.name, status: 'unavailable' };
        }
      }),
    );

    return {
      gateway: 'ok',
      status: services.every((service) => service.status === 'ok') ? 'ok' : 'degraded',
      checkedAt: new Date().toISOString(),
      services,
    };
  }
}
