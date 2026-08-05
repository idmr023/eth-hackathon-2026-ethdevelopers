import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/rbac.decorators';

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      name: 'InvoiceShield API',
      version: '0.1.0',
      description:
        'Protocolo criptográfico de coordinación y prevención de fraude en factoring B2B',
      docs: '/api/health',
    };
  }
}
