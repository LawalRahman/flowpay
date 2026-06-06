import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { DripsService } from './drips.service'

@Controller('drips')
@UseGuards(AuthGuard('jwt'))
export class DripsController {
  constructor(private dripsService: DripsService) {}

  @Post()
  create(@Req() req: any, @Body() createDripDto: any) {
    const { workflowId, ...dripData } = createDripDto
    return this.dripsService.create(req.user.id, workflowId, dripData)
  }

  @Get()
  findAll(@Req() req: any) {
    return this.dripsService.findAll(req.user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dripsService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDripDto: any) {
    return this.dripsService.update(id, updateDripDto)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    this.dripsService.delete(id)
    return { deleted: true }
  }

  @Post(':id/execute')
  execute(@Param('id') id: string) {
    return this.dripsService.executeDrip(id)
  }
}
