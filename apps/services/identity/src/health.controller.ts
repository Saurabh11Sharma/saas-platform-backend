import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return {
      service: 'identity',
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
  @Get('ready')
  ready() {
    return { service: 'identity', status: 'ready', timestamp: new Date().toISOString() };
  }
}
