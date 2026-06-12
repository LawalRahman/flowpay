import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { EscrowController } from './escrow.controller';
import { ContractExecutorService } from '../stellar/contract.executor';

@Module({
  imports: [StellarModule],
  controllers: [EscrowController],
  providers: [ContractExecutorService],
})
export class EscrowModule {}
