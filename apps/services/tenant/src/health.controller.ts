import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return { service: 'tenant', status: 'ok', timestamp: new Date().toISOString(), uptimeSeconds: Math.floor(process.uptime()) };
  }
  @Get('ready')
  ready() {
    return { service: 'tenant', status: 'ready', timestamp: new Date().toISOString() };
  }
}
