import { Module } from '@nestjs/common'
import { DripsController } from './drips.controller'
import { DripsService } from './drips.service'

@Module({
  controllers: [DripsController],
  providers: [DripsService],
  exports: [DripsService],
})
export class DripsModule {}
