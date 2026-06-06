import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): string {
    return 'FlowPay API - Event-Driven Micropayments on Stellar'
  }
}
