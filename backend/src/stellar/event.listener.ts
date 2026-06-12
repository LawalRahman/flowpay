import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StellarClientService } from './stellar.client';

export interface ContractEvent {
  type: 'CHANNEL_CREATED' | 'PAYMENT_AUTHORIZED' | 'PAYMENT_CLAIMED' | 'ESCROW_CREATED' | 'ESCROW_RELEASED' | 'SUBSCRIPTION_CREATED' | 'PAYMENT_EXECUTED';
  contractId: string;
  transactionHash: string;
  ledgerCloseTime: string;
  data: Record<string, any>;
}

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private eventStream: AsyncGenerator<any> | null = null;
  private isListening = false;
  private listenerTimer: NodeJS.Timeout | null = null;

  constructor(
    private stellarClient: StellarClientService,
    private eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    // Start listening for events after a delay to allow contracts to initialize
    setTimeout(() => this.startListening(), 5000);
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  /**
   * Start listening for contract events
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      return;
    }

    this.isListening = true;
    this.logger.log('Starting Soroban contract event listener');

    // Listen for different contract types
    this.listenToPaymentChannelEvents();
    this.listenToEscrowEvents();
    this.listenToMerchantRegistryEvents();
    this.listenToRecurringPaymentEvents();
  }

  /**
   * Stop listening for events
   */
  async stopListening(): Promise<void> {
    this.isListening = false;

    if (this.eventStream) {
      // AsyncGenerator cleanup
    }

    if (this.listenerTimer) {
      clearInterval(this.listenerTimer);
      this.listenerTimer = null;
    }

    this.logger.log('Stopped contract event listener');
  }

  /**
   * Listen to Payment Channel Events
   */
  private listenToPaymentChannelEvents(): void {
    const contractId = process.env.PAYMENT_CHANNEL_CONTRACT_ID;
    if (!contractId) return;

    this.listenerTimer = setInterval(async () => {
      try {
        // In production, you would stream events from Soroban
        // For now, we'll poll periodically
        this.logger.debug(`Polling payment channel events from ${contractId}`);
      } catch (error) {
        this.logger.error('Error listening to payment channel events:', error);
      }
    }, 10000);
  }

  /**
   * Listen to Escrow Events
   */
  private listenToEscrowEvents(): void {
    const contractId = process.env.ESCROW_CONTRACT_ID;
    if (!contractId) return;

    this.listenerTimer = setInterval(async () => {
      try {
        this.logger.debug(`Polling escrow events from ${contractId}`);
      } catch (error) {
        this.logger.error('Error listening to escrow events:', error);
      }
    }, 10000);
  }

  /**
   * Listen to Merchant Registry Events
   */
  private listenToMerchantRegistryEvents(): void {
    const contractId = process.env.MERCHANT_REGISTRY_CONTRACT_ID;
    if (!contractId) return;

    this.listenerTimer = setInterval(async () => {
      try {
        this.logger.debug(`Polling merchant registry events from ${contractId}`);
      } catch (error) {
        this.logger.error('Error listening to merchant registry events:', error);
      }
    }, 10000);
  }

  /**
   * Listen to Recurring Payment Events
   */
  private listenToRecurringPaymentEvents(): void {
    const contractId = process.env.RECURRING_PAYMENT_CONTRACT_ID;
    if (!contractId) return;

    this.listenerTimer = setInterval(async () => {
      try {
        this.logger.debug(`Polling recurring payment events from ${contractId}`);
      } catch (error) {
        this.logger.error('Error listening to recurring payment events:', error);
      }
    }, 10000);
  }

  /**
   * Emit contract event internally
   */
  emitContractEvent(event: ContractEvent): void {
    this.logger.log(`Emitting contract event: ${event.type}`);
    this.eventEmitter.emit(`contract.${event.type.toLowerCase()}`, event);
  }

  /**
   * Parse Soroban event log entry
   */
  private parseEventLog(log: any): ContractEvent | null {
    try {
      // Extract event type from log
      const type = log.topic?.[0]?.sym?.toString() as ContractEvent['type'];
      
      if (!type) {
        return null;
      }

      return {
        type,
        contractId: log.contractId,
        transactionHash: log.txHash,
        ledgerCloseTime: log.ledgerCloseTime,
        data: log.value || {},
      };
    } catch (error) {
      this.logger.error('Failed to parse event log:', error);
      return null;
    }
  }

  /**
   * Index contract event in database
   */
  async indexContractEvent(event: ContractEvent): Promise<void> {
    try {
      // Store in database for later retrieval
      this.logger.log(`Indexed contract event: ${event.type} from ${event.contractId}`);
      
      // In a real implementation, save to database
      // await this.contractEventRepository.create(event);
    } catch (error) {
      this.logger.error('Failed to index contract event:', error);
    }
  }

  /**
   * Get contract events by type
   */
  async getEventsByType(eventType: string): Promise<ContractEvent[]> {
    // In a real implementation, query from database
    return [];
  }

  /**
   * Get contract events by contract ID
   */
  async getEventsByContractId(contractId: string): Promise<ContractEvent[]> {
    // In a real implementation, query from database
    return [];
  }

  /**
   * Get recent contract events
   */
  async getRecentEvents(limit: number = 10): Promise<ContractEvent[]> {
    // In a real implementation, query from database
    return [];
  }
}
