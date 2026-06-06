import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { WorkflowService } from './workflows.service'

@Controller('workflows')
@UseGuards(AuthGuard('jwt'))
export class WorkflowsController {
  constructor(private workflowService: WorkflowService) {}

  @Post()
  create(@Req() req: any, @Body() createWorkflowDto: any) {
    return this.workflowService.create(req.user.id, createWorkflowDto)
  }

  @Get()
  findAll(@Req() req: any) {
    return this.workflowService.findAll(req.user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkflowDto: any) {
    return this.workflowService.update(id, updateWorkflowDto)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    this.workflowService.delete(id)
    return { deleted: true }
  }

  @Post(':id/execute')
  execute(@Param('id') id: string, @Body() eventPayload: any) {
    return this.workflowService.executeWorkflow(id, eventPayload)
  }
}
