import { Module, OnModuleInit } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Stellar Services
import { StellarClientService } from './stellar/stellar.client';
import { ContractExecutorService } from './stellar/contract.executor';
import { EventListenerService } from './stellar/event.listener';
import { WalletService } from './stellar/wallet.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    StellarClientService,
    ContractExecutorService,
    EventListenerService,
    WalletService,
  ],
  exports: [
    StellarClientService,
    ContractExecutorService,
    EventListenerService,
    WalletService,
  ],
})
export class StellarModule implements OnModuleInit {
  constructor(
    private stellarClient: StellarClientService,
    private eventListener: EventListenerService
  ) {}

  async onModuleInit() {
    console.log('Stellar Module Initialized');
    console.log(`Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
    console.log(`RPC URL: ${process.env.STELLAR_RPC_URL}`);

    // Initialize Stellar client connection
    await this.stellarClient.onModuleInit().catch((error) => {
      console.error('Failed to initialize Stellar client:', error);
    });

    // Start event listener after 5 seconds
    setTimeout(() => {
      this.eventListener.startListening().catch((error) => {
        console.error('Failed to start event listener:', error);
      });
    }, 5000);
  }
}
