import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authClient } from '../lib/auth-client'
import { useNodes, useCreateNode, useDeleteNode } from '../hooks/useNodes'
import type { Node } from '@imp/shared/types'
import type { Resolver } from 'react-hook-form'




const nodeFormSchema = z.object({
  name:           z.string().min(1, 'Nama wajib diisi'),
  ipAddress:      z.string().regex(
    /^(\d{1,3}\.){3}\d{1,3}$/,
    'IP address tidak valid'
  ),
  region:         z.string().min(1, 'Region wajib diisi'),
  type:           z.enum(['compute', 'storage', 'gpu']),
  totalRamGb:     z.coerce.number().int().min(1),
  totalCpuCores:  z.coerce.number().int().min(1),
  totalStorageGb: z.coerce.number().int().min(1),
})


type NodeForm = z.infer<typeof nodeFormSchema>

export const Route = createFileRoute('/nodes')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/login' })
    if (!['admin', 'superAdmin'].includes(session.user.role ?? '')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: NodesPage,
})



function NodesPage() {
  const { data: nodes = [], isLoading, error } = useNodes()
  const createNode = useCreateNode()
  const deleteNode = useDeleteNode()
  const [showForm, setShowForm] = useState(false)


  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<NodeForm, unknown, NodeForm>({
    resolver: zodResolver(nodeFormSchema) as Resolver<NodeForm>,
    defaultValues: { type: 'compute' },
  })


const onSubmit = async (data: NodeForm) => {
  await createNode.mutateAsync({
    name:           data.name,
    ipAddress:      data.ipAddress,
    region:         data.region,
    type:           data.type,
    totalRamGb:     data.totalRamGb,
    totalCpuCores:  data.totalCpuCores,
    totalStorageGb: data.totalStorageGb,
  })
  reset()
  setShowForm(false)
}

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <div>
      <div>
        <h1>Nodes</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Batal' : '+ Tambah Node'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <h2>Tambah Node</h2>
          <div>
            <label>Nama</label>
            <input {...register('name')} />
            {errors.name && <p>{errors.name.message}</p>}
          </div>
          <div>
            <label>IP Address</label>
            <input {...register('ipAddress')} />
            {errors.ipAddress && <p>{errors.ipAddress.message}</p>}
          </div>
          <div>
            <label>Region</label>
            <input {...register('region')} />
            {errors.region && <p>{errors.region.message}</p>}
          </div>
          <div>
            <label>Type</label>
            <select {...register('type')}>
              <option value="compute">Compute</option>
              <option value="storage">Storage</option>
              <option value="gpu">GPU</option>
            </select>
          </div>
          <div>
            <label>RAM (GB)</label>
            <input type="number" {...register('totalRamGb')} />
            {errors.totalRamGb && <p>{errors.totalRamGb.message}</p>}
          </div>
          <div>
            <label>CPU Cores</label>
            <input type="number" {...register('totalCpuCores')} />
            {errors.totalCpuCores && <p>{errors.totalCpuCores.message}</p>}
          </div>
          <div>
            <label>Storage (GB)</label>
            <input type="number" {...register('totalStorageGb')} />
            {errors.totalStorageGb && <p>{errors.totalStorageGb.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>IP</th>
            <th>Region</th>
            <th>Type</th>
            <th>Status</th>
            <th>RAM</th>
            <th>CPU</th>
            <th>Storage</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {nodes.length === 0 && (
            <tr><td colSpan={9}>Belum ada node.</td></tr>
          )}
          {nodes.map((node: Node) => (
            <tr key={node.id}>
              <td>{node.name}</td>
              <td>{node.ipAddress}</td>
              <td>{node.region}</td>
              <td>{node.type}</td>
              <td>{node.status}</td>
              <td>{node.usedRamGb}/{node.totalRamGb} GB</td>
              <td>{node.usedCpuCores}/{node.totalCpuCores} cores</td>
              <td>{node.usedStorageGb}/{node.totalStorageGb} GB</td>
              <td>
                <button
                  onClick={() => deleteNode.mutate(node.id)}
                  disabled={deleteNode.isPending}
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}