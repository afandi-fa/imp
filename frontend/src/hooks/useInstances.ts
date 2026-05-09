import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Instance } from '@imp/shared/types'

const INSTANCES_KEY = ['instances']

export function useInstances() {
  return useQuery({
    queryKey: INSTANCES_KEY,
    queryFn: async () => {
      const res = await api<Instance[]>('/api/instances')
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
  })
}

export function useCreateInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      planId: string
      name: string
      osImage: 'ubuntu-22.04' | 'ubuntu-24.04' | 'debian-12' | 'alpine-3.19'
    }) => {
      const res = await api<Instance>('/api/instances', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INSTANCES_KEY }),
  })
}

export function useStopInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api<Instance>(`/api/instances/${id}/stop`, { method: 'POST' })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INSTANCES_KEY }),
  })
}

export function useStartInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api<Instance>(`/api/instances/${id}/start`, { method: 'POST' })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INSTANCES_KEY }),
  })
}

export function useTerminateInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api<Instance>(`/api/instances/${id}/terminate`, { method: 'POST' })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INSTANCES_KEY }),
  })
}