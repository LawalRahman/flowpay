import { useQuery } from '@tanstack/react-query'
import { transactions } from '../services'

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await transactions.list()
      return data
    },
  })
}

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const { data } = await transactions.get(id)
      return data
    },
    enabled: !!id,
  })
}
