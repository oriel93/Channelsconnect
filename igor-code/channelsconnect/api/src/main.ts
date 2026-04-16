import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - allow frontend origins
  // FRONTEND_URL is injected by SST / ECS task environment.
  // Fallback to localhost origins for local development.
  const productionOrigins: string[] = [];
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    // Support comma-separated list, e.g. "https://channelsconnect.com,https://www.channelsconnect.com"
    frontendUrl.split(',').map((u) => u.trim()).filter(Boolean).forEach((u) => {
      productionOrigins.push(u);
      // Also allow the www. variant automatically
      if (!u.includes('//www.') && u.startsWith('https://')) {
        productionOrigins.push(u.replace('https://', 'https://www.'));
      }
    });
  } else {
    // Hard-coded fallback so dev environments still work if FRONTEND_URL is not set
    productionOrigins.push('https://channelsconnect.com', 'https://www.channelsconnect.com');
  }

  const allowedOrigins = [
    ...productionOrigins,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'x-webhook-signature',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 hours — browsers cache the preflight result
  });

  console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Channels Connect API')
    .setDescription('The Channels Connect API - Property Management & Channel Management Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Export Swagger JSON for type generation
  const outputPath = path.resolve(process.cwd(), 'swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`📝 Swagger JSON exported to: ${outputPath}`);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();

 