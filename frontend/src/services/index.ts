import type { Drip, Transaction, User, Workflow } from '../types';
import apiClient from './api';

// Auth
export const auth = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    }),
  register: (email: string, password: string) =>
    apiClient.post<{ user: User; token: string }>('/auth/register', {
      email,
      password,
    }),
  logout: () => localStorage.removeItem('auth_token'),
}

// Workflows
export const workflows = {
  list: () => apiClient.get<Workflow[]>('/workflows'),
  create: (workflow: Omit<Workflow, 'id' | 'createdAt'>) =>
    apiClient.post<Workflow>('/workflows', workflow),
  update: (id: string, workflow: Partial<Workflow>) =>
    apiClient.patch<Workflow>(`/workflows/${id}`, workflow),
  delete: (id: string) => apiClient.delete(`/workflows/${id}`),
}

// Drips
export const drips = {
  list: () => apiClient.get<Drip[]>('/drips'),
  create: (drip: Omit<Drip, 'id' | 'createdAt'>) =>
    apiClient.post<Drip>('/drips', drip),
  update: (id: string, drip: Partial<Drip>) =>
    apiClient.patch<Drip>(`/drips/${id}`, drip),
  delete: (id: string) => apiClient.delete(`/drips/${id}`),
}

// Transactions
export const transactions = {
  list: () => apiClient.get<Transaction[]>('/transactions'),
  get: (id: string) => apiClient.get<Transaction>(`/transactions/${id}`),
}
