import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Resolver } from 'react-hook-form'
import { authClient } from '../lib/auth-client'
import { useInstances, useCreateInstance, useStopInstance, useStartInstance, useTerminateInstance } from '../hooks/useInstances'
import { usePlans } from '../hooks/usePlans'
import type { Instance } from '@imp/shared/types'

const instanceFormSchema = z.object({
  name:    z.string().min(3, 'Nama minimal 3 karakter').max(50),
  planId:  z.string().min(1, 'Plan wajib dipilih'),
  osImage: z.enum(['ubuntu-22.04', 'ubuntu-24.04', 'debian-12', 'alpine-3.19']),
})

type InstanceForm = z.infer<typeof instanceFormSchema>

export const Route = createFileRoute('/instances')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: InstancesPage,
})

function InstancesPage() {
  const { data: instances = [], isLoading, error } = useInstances()
  const { data: plans = [] } = usePlans()
  const createInstance  = useCreateInstance()
  const stopInstance    = useStopInstance()
  const startInstance   = useStartInstance()
  const terminateInstance = useTerminateInstance()
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InstanceForm, unknown, InstanceForm>({
    resolver: zodResolver(instanceFormSchema) as Resolver<InstanceForm>,
    defaultValues: { osImage: 'ubuntu-22.04' },
  })

  const onSubmit = async (data: InstanceForm) => {
    try {
      setActionError(null)
      await createInstance.mutateAsync(data)
      reset()
      setShowForm(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal membuat instance')
    }
  }

  const handleAction = async (action: () => Promise<unknown>) => {
    try {
      setActionError(null)
      await action()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Aksi gagal')
    }
  }

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <div>
      <div>
        <h1>Instances</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Batal' : '+ Provision Instance'}
        </button>
      </div>

      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <h2>Provision Instance Baru</h2>
          <div>
            <label>Nama</label>
            <input {...register('name')} placeholder="my-server" />
            {errors.name && <p>{errors.name.message}</p>}
          </div>
          <div>
            <label>Plan</label>
            <select {...register('planId')}>
              <option value="">-- Pilih Plan --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.cpuCores} CPU, {p.ramGb}GB RAM, {p.storageGb}GB Storage
                </option>
              ))}
            </select>
            {errors.planId && <p>{errors.planId.message}</p>}
          </div>
          <div>
            <label>OS Image</label>
            <select {...register('osImage')}>
              <option value="ubuntu-22.04">Ubuntu 22.04</option>
              <option value="ubuntu-24.04">Ubuntu 24.04</option>
              <option value="debian-12">Debian 12</option>
              <option value="alpine-3.19">Alpine 3.19</option>
            </select>
          </div>
          {isSubmitting && <p>Provisioning...</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Provision'}
          </button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Status</th>
            <th>OS</th>
            <th>IP</th>
            <th>Dibuat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {instances.length === 0 && (
            <tr><td colSpan={6}>Belum ada instance.</td></tr>
          )}
          {instances.map((instance: Instance) => (
            <tr key={instance.id}>
              <td>{instance.name}</td>
              <td>{instance.status}</td>
              <td>{instance.osImage}</td>
              <td>{instance.ipAddress ?? '-'}</td>
              <td>{new Date(instance.createdAt).toLocaleDateString('id-ID')}</td>
              <td>
                {instance.status === 'running' && (
                  <button
                    onClick={() => handleAction(() => stopInstance.mutateAsync(instance.id))}
                    disabled={stopInstance.isPending}
                  >
                    Stop
                  </button>
                )}
                {instance.status === 'stopped' && (
                  <button
                    onClick={() => handleAction(() => startInstance.mutateAsync(instance.id))}
                    disabled={startInstance.isPending}
                  >
                    Start
                  </button>
                )}
                {instance.status !== 'terminated' && (
                  <button
                    onClick={() => handleAction(() => terminateInstance.mutateAsync(instance.id))}
                    disabled={terminateInstance.isPending}
                  >
                    Terminate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}