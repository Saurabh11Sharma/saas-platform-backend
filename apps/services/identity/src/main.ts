import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  const port = Number(process.env.IDENTITY_PORT ?? 4101);
  await app.listen(port, '0.0.0.0');
  console.log('Identity service listening on port ' + port);
}

void bootstrap();
