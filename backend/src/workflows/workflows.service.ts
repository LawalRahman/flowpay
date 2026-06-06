import { Injectable } from '@nestjs/common'
import { StellarService } from './stellar.service'

export interface Workflow {
  id: string
  userId: string
  name: string
  trigger: string
  conditions: string[]
  actions: WorkflowAction[]
  active: boolean
  createdAt: Date
}

export interface WorkflowAction {
  type: 'drip' | 'payment' | 'notification'
  config: Record<string, unknown>
}

@Injectable()
export class WorkflowService {
  private workflows: Map<string, Workflow> = new Map()
  private workflowCounter = 0

  constructor(private stellarService: StellarService) {}

  create(userId: string, workflow: Omit<Workflow, 'id' | 'createdAt'>): Workflow {
    const id = `workflow_${++this.workflowCounter}`
    const newWorkflow: Workflow = {
      ...workflow,
      id,
      userId,
      createdAt: new Date(),
    }
    this.workflows.set(id, newWorkflow)
    return newWorkflow
  }

  findAll(userId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter((w) => w.userId === userId)
  }

  findOne(id: string): Workflow | undefined {
    return this.workflows.get(id)
  }

  update(id: string, updates: Partial<Workflow>): Workflow | undefined {
    const workflow = this.workflows.get(id)
    if (workflow) {
      const updated = { ...workflow, ...updates }
      this.workflows.set(id, updated)
      return updated
    }
    return undefined
  }

  delete(id: string): boolean {
    return this.workflows.delete(id)
  }

  async executeWorkflow(workflowId: string, eventPayload: any): Promise<void> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow || !workflow.active) {
      return
    }

    // Execute each action in the workflow
    for (const action of workflow.actions) {
      if (action.type === 'payment') {
        // Execute payment action
        const config = action.config as any
        await this.stellarService.createPayment(
          config.from,
          config.to,
          config.amount,
          config.asset,
        )
      } else if (action.type === 'drip') {
        // Drip action would be handled by DripsService
        console.log('Triggering drip:', action.config)
      }
    }
  }
}
