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

export class CreateEscrowDto {
  payerSecretKey: string;
  payeeAddress: string;
  arbitratorAddress: string;
  assetAddress: string;
  amount: number;
  releaseAt: number;
  expiresAt: number;
}

export class ApproveEscrowDto {
  arbitratorSecretKey: string;
  escrowId: number;
}

export class ReleaseEscrowDto {
  arbitratorSecretKey: string;
  escrowId: number;
}

@Controller('api/escrow')
export class EscrowController {
  private readonly logger = new Logger(EscrowController.name);

  constructor(private contractExecutor: ContractExecutorService) {}

  /**
   * POST /api/escrow/create
   * Create new escrow
   */
  @Post('create')
  async createEscrow(@Body() dto: CreateEscrowDto): Promise<any> {
    try {
      const escrowId = await this.contractExecutor.createEscrow(
        dto.payerSecretKey,
        dto.payeeAddress,
        dto.arbitratorAddress,
        dto.assetAddress,
        dto.amount,
        dto.releaseAt,
        dto.expiresAt
      );

      return {
        success: true,
        escrowId,
        message: 'Escrow created successfully',
        data: {
          amount: dto.amount,
          payee: dto.payeeAddress.substring(0, 4) + '****',
          arbitrator: dto.arbitratorAddress.substring(0, 4) + '****',
          releaseAt: new Date(dto.releaseAt * 1000).toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create escrow:', error);
      throw new BadRequestException('Failed to create escrow');
    }
  }

  /**
   * POST /api/escrow/approve
   * Approve escrow for release
   */
  @Post('approve')
  async approveEscrow(@Body() dto: ApproveEscrowDto): Promise<any> {
    try {
      const transactionId = await this.contractExecutor.approveEscrow(
        dto.arbitratorSecretKey,
        dto.escrowId
      );

      return {
        success: true,
        transactionId,
        message: 'Escrow approved',
        data: {
          escrowId: dto.escrowId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to approve escrow:', error);
      throw new BadRequestException('Failed to approve escrow');
    }
  }

  /**
   * POST /api/escrow/release
   * Release escrow to payee
   */
  @Post('release')
  async releaseEscrow(@Body() dto: ReleaseEscrowDto): Promise<any> {
    try {
      const transactionId = await this.contractExecutor.releaseEscrow(
        dto.arbitratorSecretKey,
        dto.escrowId
      );

      return {
        success: true,
        transactionId,
        message: 'Escrow released successfully',
        data: {
          escrowId: dto.escrowId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to release escrow:', error);
      throw new BadRequestException('Failed to release escrow');
    }
  }
}
