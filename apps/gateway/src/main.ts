import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.enableShutdownHooks();
  const port = Number(process.env.GATEWAY_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log('API Gateway listening on port ' + port);
}
void bootstrap();
