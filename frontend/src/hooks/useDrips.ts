import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { drips } from '../services'
import type { Drip } from '../types'

export const useDrips = () => {
  return useQuery({
    queryKey: ['drips'],
    queryFn: async () => {
      const { data } = await drips.list()
      return data
    },
  })
}

export const useCreateDrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (drip: Omit<Drip, 'id' | 'createdAt'>) =>
      drips.create(drip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drips'] })
    },
  })
}

export const useUpdateDrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, drip }: { id: string; drip: Partial<Drip> }) =>
      drips.update(id, drip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drips'] })
    },
  })
}
