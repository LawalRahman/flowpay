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

export class CreateSubscriptionDto {
  subscriberSecretKey: string;
  merchantAddress: string;
  assetAddress: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  durationDays: number;
}

export class ExecutePaymentCycleDto {
  subscriptionId: number;
}

@Controller('api/subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private contractExecutor: ContractExecutorService) {}

  /**
   * POST /api/subscription/create
   * Create new subscription
   */
  @Post('create')
  async createSubscription(@Body() dto: CreateSubscriptionDto): Promise<any> {
    try {
      if (dto.amount <= 0) {
        throw new BadRequestException('Amount must be positive');
      }

      if (dto.durationDays <= 0) {
        throw new BadRequestException('Duration must be positive');
      }

      const durationSeconds = dto.durationDays * 24 * 60 * 60;

      const subscriptionId = await this.contractExecutor.createSubscription(
        dto.subscriberSecretKey,
        dto.merchantAddress,
        dto.assetAddress,
        dto.amount,
        dto.frequency,
        durationSeconds
      );

      return {
        success: true,
        subscriptionId,
        message: 'Subscription created successfully',
        data: {
          amount: dto.amount,
          frequency: dto.frequency,
          durationDays: dto.durationDays,
          merchant: dto.merchantAddress.substring(0, 4) + '****',
        },
      };
    } catch (error) {
      this.logger.error('Failed to create subscription:', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * POST /api/subscription/execute-cycle
   * Execute payment cycle
   */
  @Post('execute-cycle')
  async executePaymentCycle(@Body() dto: ExecutePaymentCycleDto): Promise<any> {
    try {
      const transactionId = await this.contractExecutor.executePaymentCycle(
        dto.subscriptionId
      );

      return {
        success: true,
        transactionId,
        message: 'Payment cycle executed',
        data: {
          subscriptionId: dto.subscriptionId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to execute payment cycle:', error);
      throw new BadRequestException('Failed to execute payment cycle');
    }
  }

  /**
   * GET /api/subscription/:subscriptionId
   * Get subscription details
   */
  @Get(':subscriptionId')
  async getSubscription(@Param('subscriptionId') subscriptionId: string): Promise<any> {
    try {
      const id = parseInt(subscriptionId);

      return {
        success: true,
        subscription: {
          id,
          status: 'active',
          // In production, fetch from contract
        },
      };
    } catch (error) {
      this.logger.error('Failed to get subscription:', error);
      throw new BadRequestException('Failed to get subscription');
    }
  }
}
