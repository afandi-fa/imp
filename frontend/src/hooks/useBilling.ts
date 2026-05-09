import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { api } from '../lib/api.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'suspended'

export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'QRIS'
  | 'OVO'
  | 'GOPAY'
  | 'DANA'
  | 'CREDIT_CARD'

export interface Invoice {
  id: string
  userId: string
  instanceId: string
  planId: string
  periodStart: string
  periodEnd: string
  amount: string
  status: InvoiceStatus
  xenditInvoiceId: string | null
  xenditPaymentUrl: string | null
  xenditPaymentMethod: string | null
  dueDate: string
  paidAt: string | null
  suspendedAt: string | null
  createdAt: string
}

export interface InvoicesPage {
  invoices: Invoice[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const billingKeys = {
  all: ['billing'] as const,
  lists: () => [...billingKeys.all, 'list'] as const,
  list: (page: number) => [...billingKeys.lists(), page] as const,
  detail: (id: string) => [...billingKeys.all, 'detail', id] as const,
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useInvoices(page = 1, limit = 20) {
  return useQuery<InvoicesPage>({
    queryKey: billingKeys.list(page),
    queryFn: async () => {
      const res = await api<InvoicesPage>(
        `/api/billing?page=${page}&limit=${limit}`,
      )
      if (res.error) throw new Error(res.error.message)
      return res.data!
    },
    placeholderData: keepPreviousData,
  })
}

export function useInvoice(id: string) {
  return useQuery<Invoice>({
    queryKey: billingKeys.detail(id),
    queryFn: async () => {
      const res = await api<Invoice>(`/api/billing/${id}`)
      if (res.error) throw new Error(res.error.message)
      return res.data!
    },
    enabled: !!id,
  })
}

export function usePayInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      invoiceId,
      paymentMethod,
    }: {
      invoiceId: string
      paymentMethod: PaymentMethod
    }) => {
      const res = await api<{
        invoiceId: string
        paymentUrl: string | null
        paymentMethod: string | null
        amount: string
      }>(`/api/billing/${invoiceId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      })
      if (res.error) throw new Error(res.error.message)
      return res.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.lists() })
    },
  })
}