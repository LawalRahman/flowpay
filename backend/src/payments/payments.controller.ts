import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ContractExecutorService } from '../stellar/contract.executor';
import { StellarClientService } from '../stellar/stellar.client';

export class CreateChannelDto {
  payerSecretKey: string;
  recipientAddress: string;
  assetAddress: string;
  amount: number;
}

export class AuthorizePaymentDto {
  payerSecretKey: string;
  amount: number;
  nonce: number;
}

export class ClaimPaymentDto {
  recipientSecretKey: string;
  payerAddress: string;
  amount: number;
}

@Controller('api/payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private contractExecutor: ContractExecutorService,
    private stellarClient: StellarClientService
  ) {}

  /**
   * POST /api/payments/open
   * Open a new payment channel
   */
  @Post('open')
  async openChannel(@Body() dto: CreateChannelDto): Promise<any> {
    try {
      const transactionId = await this.contractExecutor.openPaymentChannel(
        dto.payerSecretKey,
        dto.recipientAddress,
        dto.assetAddress,
        dto.amount
      );

      return {
        success: true,
        transactionId,
        message: 'Payment channel opened successfully',
        data: {
          payer: dto.payerSecretKey.substring(0, 4) + '****',
          recipient: dto.recipientAddress.substring(0, 4) + '****',
          amount: dto.amount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to open payment channel:', error);
      throw new BadRequestException('Failed to open payment channel');
    }
  }

  /**
   * POST /api/payments/authorize
   * Authorize a micropayment
   */
  @Post('authorize')
  async authorizePayment(@Body() dto: AuthorizePaymentDto): Promise<any> {
    try {
      const transactionId = await this.contractExecutor.authorizePayment(
        dto.payerSecretKey,
        dto.amount,
        dto.nonce
      );

      return {
        success: true,
        transactionId,
        message: 'Payment authorized',
        data: {
          amount: dto.amount,
          nonce: dto.nonce,
        },
      };
    } catch (error) {
      this.logger.error('Failed to authorize payment:', error);
      throw new BadRequestException('Failed to authorize payment');
    }
  }

  /**
   * POST /api/payments/claim
   * Claim authorized payment
   */
  @Post('claim')
  async claimPayment(@Body() dto: ClaimPaymentDto): Promise<any> {
    try {
      const transactionId = await this.contractExecutor.claimPayment(
        dto.recipientSecretKey,
        dto.payerAddress,
        dto.amount
      );

      return {
        success: true,
        transactionId,
        message: 'Payment claimed successfully',
        data: {
          amount: dto.amount,
          claimedBy: dto.recipientSecretKey.substring(0, 4) + '****',
        },
      };
    } catch (error) {
      this.logger.error('Failed to claim payment:', error);
      throw new BadRequestException('Failed to claim payment');
    }
  }

  /**
   * GET /api/payments/balance/:payerAddress
   * Get payment channel balance
   */
  @Get('balance/:payerAddress')
  async getBalance(@Param('payerAddress') payerAddress: string): Promise<any> {
    try {
      const balance = await this.contractExecutor.getChannelBalance(payerAddress);

      return {
        success: true,
        payerAddress,
        balance,
      };
    } catch (error) {
      this.logger.error('Failed to get balance:', error);
      throw new BadRequestException('Failed to get balance');
    }
  }

  /**
   * GET /api/payments/network-info
   * Get Stellar network information
   */
  @Get('network-info')
  async getNetworkInfo(): Promise<any> {
    try {
      const networkInfo = await this.stellarClient.getNetworkInfo();

      return {
        success: true,
        network: networkInfo,
      };
    } catch (error) {
      this.logger.error('Failed to get network info:', error);
      throw new BadRequestException('Failed to get network info');
    }
  }
}
