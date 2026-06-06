import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workflows } from '../services'
import type { Workflow } from '../types'

export const useWorkflows = () => {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data } = await workflows.list()
      return data
    },
  })
}

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workflow: Omit<Workflow, 'id' | 'createdAt'>) =>
      workflows.create(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, workflow }: { id: string; workflow: Partial<Workflow> }) =>
      workflows.update(id, workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}
