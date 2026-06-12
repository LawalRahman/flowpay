import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { SubscriptionController } from './subscriptions.controller';
import { ContractExecutorService } from '../stellar/contract.executor';

@Module({
  imports: [StellarModule],
  controllers: [SubscriptionController],
  providers: [ContractExecutorService],
})
export class SubscriptionModule {}
