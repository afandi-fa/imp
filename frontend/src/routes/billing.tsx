import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client.js'
import {
  useInvoices,
  usePayInvoice,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from '../hooks/useBilling'

// ─── Route guard ──────────────────────────────────────────────────────────────

export const Route = createFileRoute('/billing')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: BillingPage,
})

// ─── Payment Method Modal ─────────────────────────────────────────────────────

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Transfer Bank',  icon: '🏦' },
  { value: 'QRIS',          label: 'QRIS',           icon: '📱' },
  { value: 'GOPAY',         label: 'GoPay',          icon: '💚' },
  { value: 'OVO',           label: 'OVO',            icon: '💜' },
  { value: 'DANA',          label: 'DANA',           icon: '💙' },
  { value: 'CREDIT_CARD',   label: 'Kartu Kredit',   icon: '💳' },
]

function PayModal({
  invoice,
  onClose,
  onConfirm,
  isPending,
}: {
  invoice: Invoice
  onClose: () => void
  onConfirm: (method: PaymentMethod) => void
  isPending: boolean
}) {
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Bayar Invoice</h2>
        <p className="mb-1 text-sm text-gray-500">
          Total:{' '}
          <span className="font-semibold text-gray-900">
            {formatAmount(invoice.amount)}
          </span>
        </p>
        <p className="mb-4 text-xs text-gray-400">
          Periode: {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
        </p>

        <p className="mb-2 text-sm font-medium text-gray-700">Metode Pembayaran</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                name="method"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                className="accent-blue-600"
              />
              <span>{m.icon}</span>
              <span className="font-medium text-gray-800">{m.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(method)}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Memproses...' : 'Lanjutkan Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment URL Modal — setelah Xendit invoice dibuat ────────────────────────

function PaymentUrlModal({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Invoice Berhasil Dibuat
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Klik tombol di bawah untuk melanjutkan pembayaran melalui Xendit.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Bayar Sekarang →
        </a>
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  unpaid:    { label: 'Belum Dibayar', className: 'bg-yellow-100 text-yellow-700' },
  paid:      { label: 'Lunas',         className: 'bg-green-100 text-green-700'  },
  overdue:   { label: 'Jatuh Tempo',   className: 'bg-orange-100 text-orange-700' },
  suspended: { label: 'Disuspend',     className: 'bg-red-100 text-red-700'     },
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function BillingPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, isFetching } = useInvoices(page)
  const payMutation = usePayInvoice()

  const [payTarget, setPayTarget]       = useState<Invoice | null>(null)
  const [paymentUrl, setPaymentUrl]     = useState<string | null>(null)
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)

  const handlePayConfirm = async (method: PaymentMethod) => {
    if (!payTarget) return
    try {
      setErrorMsg(null)
      const result = await payMutation.mutateAsync({
        invoiceId: payTarget.id,
        paymentMethod: method,
      })
      setPayTarget(null)
      if (result.paymentUrl) setPaymentUrl(result.paymentUrl)
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
  }

  const buildPageNumbers = (
    totalPages: number,
    current: number,
  ): (number | '...')[] => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - current) <= 2,
    )
    return pages.reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="mt-1 text-sm text-gray-500">
              Riwayat invoice dan pembayaran instance kamu.
            </p>
          </div>
          {data && (
            <span className="mt-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
              {data.total} invoice
            </span>
          )}
        </div>

        {/* Error toast */}
        {errorMsg && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-4 font-bold">×</button>
          </div>
        )}

        {/* Overdue warning */}
        {data?.invoices.some((inv) => inv.status === 'overdue' || inv.status === 'suspended') && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            ⚠️ Kamu memiliki invoice yang belum dibayar. Instance akan disuspend otomatis
            jika invoice overdue lebih dari 3 hari.
          </div>
        )}

        {/* Table */}
        <div
          className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity ${
            isFetching ? 'opacity-70' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Memuat data...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-20 text-sm text-red-500">
              Gagal memuat data. Coba refresh.
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Invoice</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Periode</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Jumlah</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Jatuh Tempo</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        Belum ada invoice.
                      </td>
                    </tr>
                  ) : (
                    data?.invoices.map((inv) => (
                      <tr key={inv.id} className="transition-colors hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-gray-500">
                            #{inv.id.slice(-8).toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Instance: {inv.instanceId.slice(-8)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          <div>{formatDate(inv.periodStart)}</div>
                          <div className="text-xs text-gray-400">
                            s/d {formatDate(inv.periodEnd)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                          {formatAmount(inv.amount)}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(inv.dueDate)}
                          {inv.paidAt && (
                            <div className="text-xs text-green-600">
                              Dibayar {formatDate(inv.paidAt)}
                            </div>
                          )}
                          {inv.suspendedAt && (
                            <div className="text-xs text-red-500">
                              Disuspend {formatDate(inv.suspendedAt)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status} />
                        </td>

                        <td className="px-4 py-3 text-right">
                          {(inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'suspended') && (
                            <button
                              onClick={() => setPayTarget(inv)}
                              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              Bayar
                            </button>
                          )}
                          {inv.status === 'paid' && inv.xenditPaymentMethod && (
                            <span className="text-xs text-gray-400">
                              via {inv.xenditPaymentMethod}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                  <span className="text-xs text-gray-500">
                    Halaman {data.page} dari {data.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1 || isFetching}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    {buildPageNumbers(data.totalPages, page).map((p, i) =>
                      p === '...' ? (
                        <span key={`e-${i}`} className="px-1 py-1.5 text-xs text-gray-400">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          disabled={isFetching}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page === data.totalPages || isFetching}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {payTarget && (
        <PayModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onConfirm={handlePayConfirm}
          isPending={payMutation.isPending}
        />
      )}
      {paymentUrl && (
        <PaymentUrlModal
          url={paymentUrl}
          onClose={() => setPaymentUrl(null)}
        />
      )}
    </div>
  )
}