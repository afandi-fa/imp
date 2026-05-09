import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Node, NewNode } from '@imp/shared/types'

const NODES_KEY = ['nodes']

export function useNodes() {
  return useQuery({
    queryKey: NODES_KEY,
    queryFn: async () => {
      const res = await api<Node[]>('/api/nodes')
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
  })
}

export function useNode(id: string) {
  return useQuery({
    queryKey: [...NODES_KEY, id],
    queryFn: async () => {
      const res = await api<Node>(`/api/nodes/${id}`)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
  })
}

export function useCreateNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewNode) => {
      const res = await api<Node>('/api/nodes', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NODES_KEY }),
  })
}

export function useUpdateNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewNode> }) => {
      const res = await api<Node>(`/api/nodes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NODES_KEY }),
  })
}

export function useDeleteNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api<Node>(`/api/nodes/${id}`, { method: 'DELETE' })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NODES_KEY }),
  })
}