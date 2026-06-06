// Placeholder for Prisma schema - will be configured separately
// This file documents the database models for FlowPay

export interface UserModel {
  id: string
  email: string
  walletAddress?: string
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowModel {
  id: string
  userId: string
  name: string
  trigger: string
  conditions: string[]
  actions: any[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DripModel {
  id: string
  workflowId: string
  userId: string
  amount: number
  currency: string
  frequency: string
  duration: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TransactionModel {
  id: string
  userId: string
  dripId?: string
  amount: number
  currency: string
  status: string
  hash: string
  createdAt: Date
  updatedAt: Date
}
