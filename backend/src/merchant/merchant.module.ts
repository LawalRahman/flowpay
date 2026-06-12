import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { MerchantController } from './merchant.controller';
import { ContractExecutorService } from '../stellar/contract.executor';

@Module({
  imports: [StellarModule],
  controllers: [MerchantController],
  providers: [ContractExecutorService],
})
export class MerchantModule {}
