import { Injectable, Logger } from '@nestjs/common';
import * as SorobanClient from 'soroban-client';
import { StellarClientService } from './stellar.client';

@Injectable()
export class ContractExecutorService {
  private readonly logger = new Logger(ContractExecutorService.name);

  constructor(private stellarClient: StellarClientService) {}

  /**
   * Payment Channel Operations
   */

  async openPaymentChannel(
    payerSecretKey: string,
    recipientAddress: string,
    assetAddress: string,
    amount: number
  ): Promise<string> {
    const paymentChannelContract = process.env.PAYMENT_CHANNEL_CONTRACT_ID;

    try {
      // Build parameters for Soroban call
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(payerSecretKey),
        SorobanClient.nativeToScVal(recipientAddress),
        SorobanClient.nativeToScVal(assetAddress),
        SorobanClient.nativeToScVal(amount),
      ];

      // Invoke contract
      const result = await this.stellarClient.invokeContract(
        paymentChannelContract,
        'initialize_channel',
        params,
        payerSecretKey
      );

      this.logger.log(`Payment channel opened: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to open payment channel:', error);
      throw error;
    }
  }

  async authorizePayment(
    payerSecretKey: string,
    amount: number,
    nonce: number
  ): Promise<string> {
    const paymentChannelContract = process.env.PAYMENT_CHANNEL_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(payerSecretKey),
        SorobanClient.nativeToScVal(amount),
        SorobanClient.nativeToScVal(nonce),
      ];

      const result = await this.stellarClient.invokeContract(
        paymentChannelContract,
        'authorize_payment',
        params,
        payerSecretKey
      );

      this.logger.log(`Payment authorized: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to authorize payment:', error);
      throw error;
    }
  }

  async claimPayment(
    recipientSecretKey: string,
    payerAddress: string,
    amount: number
  ): Promise<string> {
    const paymentChannelContract = process.env.PAYMENT_CHANNEL_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(payerAddress),
        SorobanClient.nativeToScVal(amount),
      ];

      const result = await this.stellarClient.invokeContract(
        paymentChannelContract,
        'claim',
        params,
        recipientSecretKey
      );

      this.logger.log(`Payment claimed: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to claim payment:', error);
      throw error;
    }
  }

  /**
   * Escrow Operations
   */

  async createEscrow(
    payerSecretKey: string,
    payeeAddress: string,
    arbitratorAddress: string,
    assetAddress: string,
    amount: number,
    releaseAt: number,
    expiresAt: number
  ): Promise<number> {
    const escrowContract = process.env.ESCROW_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(payerSecretKey),
        SorobanClient.nativeToScVal(payeeAddress),
        SorobanClient.nativeToScVal(arbitratorAddress),
        SorobanClient.nativeToScVal(assetAddress),
        SorobanClient.nativeToScVal(amount),
        SorobanClient.nativeToScVal(releaseAt),
        SorobanClient.nativeToScVal(expiresAt),
      ];

      const result = await this.stellarClient.invokeContract(
        escrowContract,
        'create_escrow',
        params,
        payerSecretKey
      );

      this.logger.log(`Escrow created from transaction: ${result.id}`);
      return 1; // Escrow ID would be extracted from contract result
    } catch (error) {
      this.logger.error('Failed to create escrow:', error);
      throw error;
    }
  }

  async approveEscrow(arbitratorSecretKey: string, escrowId: number): Promise<string> {
    const escrowContract = process.env.ESCROW_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(escrowId),
      ];

      const result = await this.stellarClient.invokeContract(
        escrowContract,
        'approve',
        params,
        arbitratorSecretKey
      );

      this.logger.log(`Escrow approved: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to approve escrow:', error);
      throw error;
    }
  }

  async releaseEscrow(arbitratorSecretKey: string, escrowId: number): Promise<string> {
    const escrowContract = process.env.ESCROW_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(escrowId),
      ];

      const result = await this.stellarClient.invokeContract(
        escrowContract,
        'release',
        params,
        arbitratorSecretKey
      );

      this.logger.log(`Escrow released: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to release escrow:', error);
      throw error;
    }
  }

  /**
   * Merchant Registry Operations
   */

  async registerMerchant(
    merchantSecretKey: string,
    walletAddress: string,
    name: string,
    feePercent: number
  ): Promise<string> {
    const merchantRegistry = process.env.MERCHANT_REGISTRY_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(merchantSecretKey),
        SorobanClient.nativeToScVal(walletAddress),
        SorobanClient.nativeToScVal(name),
        SorobanClient.nativeToScVal(feePercent),
      ];

      const result = await this.stellarClient.invokeContract(
        merchantRegistry,
        'register',
        params,
        merchantSecretKey
      );

      this.logger.log(`Merchant registered: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to register merchant:', error);
      throw error;
    }
  }

  async setMerchantFee(
    adminSecretKey: string,
    merchantAddress: string,
    newFeePercent: number
  ): Promise<string> {
    const merchantRegistry = process.env.MERCHANT_REGISTRY_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(merchantAddress),
        SorobanClient.nativeToScVal(newFeePercent),
      ];

      const result = await this.stellarClient.invokeContract(
        merchantRegistry,
        'set_fee',
        params,
        adminSecretKey
      );

      this.logger.log(`Merchant fee updated: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to set merchant fee:', error);
      throw error;
    }
  }

  /**
   * Recurring Payment Operations
   */

  async createSubscription(
    subscriberSecretKey: string,
    merchantAddress: string,
    assetAddress: string,
    amount: number,
    frequency: string, // 'daily', 'weekly', 'monthly', etc.
    durationSeconds: number
  ): Promise<number> {
    const recurringPayment = process.env.RECURRING_PAYMENT_CONTRACT_ID;

    try {
      // Convert frequency string to enum value
      const frequencyMap = {
        daily: 0,
        weekly: 1,
        monthly: 2,
        quarterly: 3,
        yearly: 4,
      };

      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(subscriberSecretKey),
        SorobanClient.nativeToScVal(merchantAddress),
        SorobanClient.nativeToScVal(assetAddress),
        SorobanClient.nativeToScVal(amount),
        SorobanClient.nativeToScVal(frequencyMap[frequency] || 0),
        SorobanClient.nativeToScVal(durationSeconds),
      ];

      const result = await this.stellarClient.invokeContract(
        recurringPayment,
        'create_subscription',
        params,
        subscriberSecretKey
      );

      this.logger.log(`Subscription created from transaction: ${result.id}`);
      return 1; // Subscription ID would be extracted from contract result
    } catch (error) {
      this.logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async executePaymentCycle(subscriptionId: number): Promise<string> {
    const recurringPayment = process.env.RECURRING_PAYMENT_CONTRACT_ID;

    try {
      const params: SorobanClient.xdr.ScVal[] = [
        SorobanClient.nativeToScVal(subscriptionId),
      ];

      const result = await this.stellarClient.invokeContract(
        recurringPayment,
        'execute_cycle',
        params,
        process.env.BACKEND_SECRET_KEY // Use backend admin key
      );

      this.logger.log(`Payment cycle executed: ${result.id}`);
      return result.id;
    } catch (error) {
      this.logger.error('Failed to execute payment cycle:', error);
      throw error;
    }
  }

  /**
   * Query Operations
   */

  async getChannelBalance(payerAddress: string): Promise<number> {
    const paymentChannelContract = process.env.PAYMENT_CHANNEL_CONTRACT_ID;

    try {
      const key = SorobanClient.nativeToScVal(payerAddress);
      const state = await this.stellarClient.getContractState(
        paymentChannelContract,
        key
      );

      if (state) {
        return SorobanClient.scValToNative(state) as number;
      }

      return 0;
    } catch (error) {
      this.logger.error('Failed to get channel balance:', error);
      return 0;
    }
  }

  async getMerchantFee(merchantAddress: string): Promise<number> {
    const merchantRegistry = process.env.MERCHANT_REGISTRY_CONTRACT_ID;

    try {
      const key = SorobanClient.nativeToScVal(merchantAddress);
      const state = await this.stellarClient.getContractState(
        merchantRegistry,
        key
      );

      if (state) {
        return SorobanClient.scValToNative(state) as number;
      }

      return 0;
    } catch (error) {
      this.logger.error('Failed to get merchant fee:', error);
      return 0;
    }
  }
}
