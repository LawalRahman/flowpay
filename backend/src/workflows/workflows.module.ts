import { Module } from '@nestjs/common'
import { PaymentsModule } from '../payments/payments.module'
import { WorkflowsController } from './workflows.controller'
import { WorkflowService } from './workflows.service'

@Module({
  imports: [PaymentsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowsModule {}
