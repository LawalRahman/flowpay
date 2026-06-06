import { Injectable } from '@nestjs/common'

export interface Drip {
  id: string
  workflowId: string
  userId: string
  amount: number
  currency: 'XLM' | 'USDC'
  frequency: 'daily' | 'weekly' | 'monthly' | 'continuous'
  duration: number
  active: boolean
  createdAt: Date
  startedAt?: Date
  stoppedAt?: Date
}

@Injectable()
export class DripsService {
  private drips: Map<string, Drip> = new Map()
  private dripCounter = 0

  create(userId: string, workflowId: string, drip: Omit<Drip, 'id' | 'userId' | 'createdAt'>): Drip {
    const id = `drip_${++this.dripCounter}`
    const newDrip: Drip = {
      ...drip,
      id,
      userId,
      workflowId,
      createdAt: new Date(),
      startedAt: new Date(),
    }
    this.drips.set(id, newDrip)
    this.scheduleExecution(id)
    return newDrip
  }

  findAll(userId: string): Drip[] {
    return Array.from(this.drips.values()).filter((d) => d.userId === userId)
  }

  findOne(id: string): Drip | undefined {
    return this.drips.get(id)
  }

  update(id: string, updates: Partial<Drip>): Drip | undefined {
    const drip = this.drips.get(id)
    if (drip) {
      const updated = { ...drip, ...updates }
      this.drips.set(id, updated)
      return updated
    }
    return undefined
  }

  delete(id: string): boolean {
    const drip = this.drips.get(id)
    if (drip) {
      drip.active = false
      drip.stoppedAt = new Date()
      this.drips.set(id, drip)
      return true
    }
    return false
  }

  private scheduleExecution(dripId: string): void {
    const drip = this.drips.get(dripId)
    if (!drip || !drip.active) return

    // Calculate interval based on frequency
    let intervalMs = 24 * 60 * 60 * 1000 // default: daily
    if (drip.frequency === 'weekly') {
      intervalMs = 7 * 24 * 60 * 60 * 1000
    } else if (drip.frequency === 'monthly') {
      intervalMs = 30 * 24 * 60 * 60 * 1000
    } else if (drip.frequency === 'continuous') {
      intervalMs = 60 * 60 * 1000 // hourly for continuous
    }

    // Schedule periodic execution
    const timer = setInterval(() => {
      const currentDrip = this.drips.get(dripId)
      if (currentDrip && currentDrip.active) {
        console.log(`Executing drip: ${dripId}`)
        // Payment execution would happen here
      } else {
        clearInterval(timer)
      }
    }, intervalMs)
  }

  async executeDrip(dripId: string): Promise<void> {
    const drip = this.drips.get(dripId)
    if (!drip || !drip.active) {
      return
    }

    console.log(`Executing drip ${dripId}: ${drip.amount} ${drip.currency}`)
    // Payment transaction would be executed here
  }
}
