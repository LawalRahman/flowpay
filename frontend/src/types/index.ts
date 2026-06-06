export interface User {
  id: string
  email: string
  walletAddress?: string
  createdAt: Date
}

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

export interface Drip {
  id: string
  workflowId: string
  amount: number
  currency: 'XLM' | 'USDC'
  frequency: 'daily' | 'weekly' | 'monthly' | 'continuous'
  duration: number
  active: boolean
  createdAt: Date
}

export interface Transaction {
  id: string
  userId: string
  dripId?: string
  amount: number
  currency: 'XLM' | 'USDC'
  status: 'pending' | 'completed' | 'failed'
  hash: string
  createdAt: Date
}

export interface EventHook {
  userId: string
  eventType: string
  payload: Record<string, unknown>
}
