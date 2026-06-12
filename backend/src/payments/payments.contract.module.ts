import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { PaymentsController } from './payments.controller';
import { ContractExecutorService } from '../stellar/contract.executor';
import { StellarClientService } from '../stellar/stellar.client';

@Module({
  imports: [StellarModule],
  controllers: [PaymentsController],
  providers: [ContractExecutorService, StellarClientService],
})
export class PaymentsContractModule {}
