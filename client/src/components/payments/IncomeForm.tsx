import { useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toSafeNumber } from "@/components/payments/constants"
import type { IncomeFormValues, OutstandingOption } from "@/components/payments/types"
import { formatCurrency, formatPaymentStatus } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  pending: "Pending",
}

interface IncomeFormProps {
  form: IncomeFormValues
  onChange: (name: keyof IncomeFormValues, value: string) => void
  outstandingOptions: OutstandingOption[]
  loading?: boolean
  disabledFields?: boolean
  editMode?: boolean
  paymentMethods?: Array<{ value: string; label: string }>
  optionsLoading?: boolean
}

export default function IncomeForm({
  form,
  onChange,
  outstandingOptions,
  loading,
  disabledFields,
  editMode,
  paymentMethods = [],
  optionsLoading,
}: IncomeFormProps) {
  const customers = useMemo(() => {
    const map = new Map<string, { _id: string; name: string; phone?: string }>()
    outstandingOptions.forEach((option) => {
      const id = String(option.clientId)
      if (!map.has(id)) {
        map.set(id, {
          _id: id,
          name: option.customerName,
          phone: option.phoneNumber,
        })
      }
    })
    if (editMode && form.clientId && !map.has(form.clientId)) {
      map.set(form.clientId, {
        _id: form.clientId,
        name: form.customerName || "Selected customer",
        phone: form.phoneNumber,
      })
    }
    return Array.from(map.values())
  }, [outstandingOptions, editMode, form.clientId, form.customerName, form.phoneNumber])

  const filteredOrders = useMemo(() => {
    const filtered = form.clientId
      ? outstandingOptions.filter((option) => String(option.clientId) === form.clientId)
      : outstandingOptions

    if (editMode && form.orderId && !filtered.some((o) => String(o.orderId) === form.orderId)) {
      return [
        {
          orderId: form.orderId,
          orderNumber: form.invoiceNumber || form.orderId,
          remainingBalance: toSafeNumber(form.remainingBalance, 0),
        } as OutstandingOption,
        ...filtered,
      ]
    }

    return filtered
  }, [
    outstandingOptions,
    form.clientId,
    form.orderId,
    form.invoiceNumber,
    form.remainingBalance,
    editMode,
  ])

  const invoiceNetTotal = useMemo(() => {
    const totalAmount = Math.max(0, toSafeNumber(form.totalAmount, 0))
    const discount = Math.max(0, toSafeNumber(form.discount, 0))
    return Math.max(0, totalAmount - discount)
  }, [form.totalAmount, form.discount])

  const currentRemaining = useMemo(() => {
    const alreadyPaid = Math.max(0, toSafeNumber(form.alreadyPaid, 0))
    return Math.max(0, invoiceNetTotal - alreadyPaid)
  }, [form.alreadyPaid, invoiceNetTotal])

  const balanceAfterPayment = useMemo(() => {
    const paymentAmount = Math.max(0, toSafeNumber(form.amountPaid, 0))
    return Math.max(0, currentRemaining - paymentAmount)
  }, [currentRemaining, form.amountPaid])

  const computedStatus = useMemo(() => {
    const alreadyPaid = Math.max(0, toSafeNumber(form.alreadyPaid, 0))
    const paymentAmount = Math.max(0, toSafeNumber(form.amountPaid, 0))
    const totalPaidAfter = alreadyPaid + paymentAmount

    if (totalPaidAfter <= 0) return "unpaid"
    if (totalPaidAfter >= invoiceNetTotal) return "paid"
    return "partial"
  }, [form.alreadyPaid, form.amountPaid, invoiceNetTotal])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={form.clientId || undefined}
              onValueChange={(value) => onChange("clientId", value)}
              disabled={disabledFields || editMode || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading..." : "Select client"} />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                {customers.map((client) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order</Label>
            <Select
              value={form.orderId || undefined}
              onValueChange={(value) => onChange("orderId", value)}
              disabled={disabledFields || editMode || !form.clientId || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                {filteredOrders.map((option) => (
                  <SelectItem
                    key={String(option.orderId)}
                    value={String(option.orderId)}
                  >
                    {option.orderNumber} ({formatCurrency(option.remainingBalance)} remaining)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={form.customerName}
              onChange={(e) => onChange("customerName", e.target.value)}
              disabled={disabledFields}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={form.phoneNumber}
              onChange={(e) => onChange("phoneNumber", e.target.value)}
              disabled={disabledFields}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Invoice Number</Label>
            <Input
              value={form.invoiceNumber || ""}
              readOnly
              className="bg-muted"
              placeholder="Auto-filled when order is selected"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Payment Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Total Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.totalAmount}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Already Paid</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.alreadyPaid}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Remaining Balance</Label>
            <Input value={form.orderId ? currentRemaining.toFixed(2) : ""} readOnly className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <Input
              type="number"
              min="0"
              max={editMode ? undefined : currentRemaining || undefined}
              step="0.01"
              value={form.amountPaid}
              onChange={(e) => onChange("amountPaid", e.target.value)}
              required
              disabled={disabledFields || (!editMode && !form.orderId)}
            />
          </div>

          <div className="space-y-2">
            <Label>Discount</Label>
            <Input
              type="number"
              min="0"
              max={Math.max(0, toSafeNumber(form.totalAmount, 0))}
              step="0.01"
              value={form.discount}
              onChange={(e) => onChange("discount", e.target.value)}
              disabled={disabledFields || editMode || !form.orderId}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Balance After Payment</Label>
            <Input
              value={form.orderId ? balanceAfterPayment.toFixed(2) : ""}
              readOnly
              className="bg-muted"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={form.paymentMethod || undefined}
            onValueChange={(value) => onChange("paymentMethod", value)}
            disabled={disabledFields || optionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={optionsLoading ? "Loading..." : "Select method"} />
            </SelectTrigger>
            <SelectContent className="z-[110]">
              {paymentMethods.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  No active payment methods
                </SelectItem>
              ) : (
                paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Input
            value={STATUS_LABELS[computedStatus] || formatPaymentStatus(computedStatus)}
            readOnly
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input
            type="date"
            value={form.paymentDate}
            onChange={(e) => onChange("paymentDate", e.target.value)}
            disabled={disabledFields}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          rows={3}
          placeholder="Optional details..."
          disabled={disabledFields}
        />
      </div>
    </div>
  )
}
