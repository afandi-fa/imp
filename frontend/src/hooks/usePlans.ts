import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Plan, NewPlan } from '@imp/shared/types'

const PLANS_KEY = ['plans']

export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEY,
    queryFn: async () => {
      const res = await api<Plan[]>('/api/plans')
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
  })
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: [...PLANS_KEY, id],
    queryFn: async () => {
      const res = await api<Plan>(`/api/plans/${id}`)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewPlan) => {
      const res = await api<Plan>('/api/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewPlan> }) => {
      const res = await api<Plan>(`/api/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api<Plan>(`/api/plans/${id}`, { method: 'DELETE' })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  })
}