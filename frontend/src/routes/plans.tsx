import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Resolver } from 'react-hook-form'
import { authClient } from '../lib/auth-client'
import { usePlans, useCreatePlan, useDeletePlan } from '../hooks/usePlans'
import type { Plan } from '@imp/shared/types'

const planFormSchema = z.object({
  name:         z.string().min(1, 'Nama wajib diisi'),
  type:         z.enum(['vps', 'lxc', 'k8s_node', 'dedicated']),
  ramGb:        z.coerce.number().int().min(1),
  cpuCores:     z.coerce.number().int().min(1),
  storageGb:    z.coerce.number().int().min(1),
  bandwidthGb:  z.coerce.number().int().min(1),
  priceMonthly: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Format harga tidak valid (contoh: 50000.00)'),
})

type PlanForm = z.infer<typeof planFormSchema>

export const Route = createFileRoute('/plans')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: PlansPage,
})

function PlansPage() {
  const { data: session } = authClient.useSession()
  const { data: plans = [], isLoading, error } = usePlans()
  const createPlan = useCreatePlan()
  const deletePlan = useDeletePlan()
  const [showForm, setShowForm] = useState(false)

  const isAdmin = ['admin', 'superAdmin'].includes(session?.user.role ?? '')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PlanForm, unknown, PlanForm>({
    resolver: zodResolver(planFormSchema) as Resolver<PlanForm>,
    defaultValues: { type: 'vps' },
  })

  const onSubmit = async (data: PlanForm) => {
    await createPlan.mutateAsync({
      name:         data.name,
      type:         data.type,
      ramGb:        data.ramGb,
      cpuCores:     data.cpuCores,
      storageGb:    data.storageGb,
      bandwidthGb:  data.bandwidthGb,
      priceMonthly: data.priceMonthly,
    })
    reset()
    setShowForm(false)
  }

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <div>
      <div>
        <h1>Plans</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Batal' : '+ Tambah Plan'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <h2>Tambah Plan</h2>
          <div>
            <label>Nama</label>
            <input {...register('name')} />
            {errors.name && <p>{errors.name.message}</p>}
          </div>
          <div>
            <label>Type</label>
            <select {...register('type')}>
              <option value="vps">VPS</option>
              <option value="lxc">LXC</option>
              <option value="k8s_node">K8s Node</option>
              <option value="dedicated">Dedicated</option>
            </select>
          </div>
          <div>
            <label>RAM (GB)</label>
            <input type="number" {...register('ramGb')} />
            {errors.ramGb && <p>{errors.ramGb.message}</p>}
          </div>
          <div>
            <label>CPU Cores</label>
            <input type="number" {...register('cpuCores')} />
            {errors.cpuCores && <p>{errors.cpuCores.message}</p>}
          </div>
          <div>
            <label>Storage (GB)</label>
            <input type="number" {...register('storageGb')} />
            {errors.storageGb && <p>{errors.storageGb.message}</p>}
          </div>
          <div>
            <label>Bandwidth (GB)</label>
            <input type="number" {...register('bandwidthGb')} />
            {errors.bandwidthGb && <p>{errors.bandwidthGb.message}</p>}
          </div>
          <div>
            <label>Harga/Bulan</label>
            <input type="text" placeholder="50000.00" {...register('priceMonthly')} />
            {errors.priceMonthly && <p>{errors.priceMonthly.message}</p>}
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
            <th>Type</th>
            <th>RAM</th>
            <th>CPU</th>
            <th>Storage</th>
            <th>Bandwidth</th>
            <th>Harga/Bulan</th>
            {isAdmin && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {plans.length === 0 && (
            <tr><td colSpan={isAdmin ? 8 : 7}>Belum ada plan.</td></tr>
          )}
          {plans.map((plan: Plan) => (
            <tr key={plan.id}>
              <td>{plan.name}</td>
              <td>{plan.type}</td>
              <td>{plan.ramGb} GB</td>
              <td>{plan.cpuCores} cores</td>
              <td>{plan.storageGb} GB</td>
              <td>{plan.bandwidthGb} GB</td>
              <td>Rp {Number(plan.priceMonthly).toLocaleString('id-ID')}</td>
              {isAdmin && (
                <td>
                  <button
                    onClick={() => deletePlan.mutate(plan.id)}
                    disabled={deletePlan.isPending}
                  >
                    Hapus
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}