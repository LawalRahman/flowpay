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

export class RegisterMerchantDto {
  merchantSecretKey: string;
  walletAddress: string;
  name: string;
  feePercent: number;
}

export class SetMerchantFeeDto {
  adminSecretKey: string;
  merchantAddress: string;
  newFeePercent: number;
}

@Controller('api/merchant')
export class MerchantController {
  private readonly logger = new Logger(MerchantController.name);

  constructor(private contractExecutor: ContractExecutorService) {}

  /**
   * POST /api/merchant/register
   * Register new merchant
   */
  @Post('register')
  async registerMerchant(@Body() dto: RegisterMerchantDto): Promise<any> {
    try {
      if (dto.feePercent < 0 || dto.feePercent > 100) {
        throw new BadRequestException('Fee percentage must be between 0 and 100');
      }

      const transactionId = await this.contractExecutor.registerMerchant(
        dto.merchantSecretKey,
        dto.walletAddress,
        dto.name,
        Math.floor(dto.feePercent * 100) // Convert to basis points
      );

      return {
        success: true,
        transactionId,
        message: 'Merchant registered successfully',
        data: {
          name: dto.name,
          feePercent: dto.feePercent,
          wallet: dto.walletAddress.substring(0, 4) + '****',
        },
      };
    } catch (error) {
      this.logger.error('Failed to register merchant:', error);
      throw new BadRequestException('Failed to register merchant');
    }
  }

  /**
   * POST /api/merchant/set-fee
   * Update merchant fee
   */
  @Post('set-fee')
  async setMerchantFee(@Body() dto: SetMerchantFeeDto): Promise<any> {
    try {
      if (dto.newFeePercent < 0 || dto.newFeePercent > 100) {
        throw new BadRequestException('Fee percentage must be between 0 and 100');
      }

      const transactionId = await this.contractExecutor.setMerchantFee(
        dto.adminSecretKey,
        dto.merchantAddress,
        Math.floor(dto.newFeePercent * 100) // Convert to basis points
      );

      return {
        success: true,
        transactionId,
        message: 'Merchant fee updated',
        data: {
          merchant: dto.merchantAddress.substring(0, 4) + '****',
          newFeePercent: dto.newFeePercent,
        },
      };
    } catch (error) {
      this.logger.error('Failed to set merchant fee:', error);
      throw new BadRequestException('Failed to set merchant fee');
    }
  }

  /**
   * GET /api/merchant/fee/:merchantAddress
   * Get merchant fee
   */
  @Get('fee/:merchantAddress')
  async getMerchantFee(@Param('merchantAddress') merchantAddress: string): Promise<any> {
    try {
      const feePercent = await this.contractExecutor.getMerchantFee(merchantAddress);

      return {
        success: true,
        merchant: merchantAddress,
        feePercent: feePercent / 100, // Convert from basis points
      };
    } catch (error) {
      this.logger.error('Failed to get merchant fee:', error);
      throw new BadRequestException('Failed to get merchant fee');
    }
  }
}
