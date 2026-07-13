import { useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Receipt } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import IncomeForm from "@/components/payments/IncomeForm"
import ExpenseForm from "@/components/payments/ExpenseForm"
import {
  initialExpenseForm,
  initialIncomeForm,
} from "@/hooks/usePayments"
import { usePaymentOptions } from "@/hooks/usePaymentOptions"
import { PAYMENT_TYPE_OPTIONS, toSafeNumber } from "@/components/payments/constants"
import type {
  ExpenseFormValues,
  IncomeFormValues,
  OutstandingOption,
  PaymentTransaction,
  PaymentType,
} from "@/components/payments/types"

interface PaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outstandingOptions: OutstandingOption[]
  outstandingLoading?: boolean
  onLoadOutstanding: () => Promise<void> | void
  submitting?: boolean
  editing?: PaymentTransaction | null
  onCreateIncome: (form: IncomeFormValues) => Promise<boolean>
  onUpdateIncome: (id: string, form: IncomeFormValues) => Promise<boolean>
  onCreateExpense: (form: ExpenseFormValues) => Promise<boolean>
  onUpdateExpense: (id: string, form: ExpenseFormValues) => Promise<boolean>
}

export default function PaymentForm({
  open,
  onOpenChange,
  outstandingOptions,
  outstandingLoading,
  onLoadOutstanding,
  submitting,
  editing,
  onCreateIncome,
  onUpdateIncome,
  onCreateExpense,
  onUpdateExpense,
}: PaymentFormProps) {
  const [paymentType, setPaymentType] = useState<PaymentType>("income")
  const [incomeForm, setIncomeForm] = useState<IncomeFormValues>(initialIncomeForm())
  const [expenseForm, setExpenseForm] = useState<ExpenseFormValues>(initialExpenseForm())
  const {
    expenseCategories,
    incomeMethods,
    expenseMethods,
    loading: optionsLoading,
  } = usePaymentOptions({ enabled: open })

  const reset = () => {
    setPaymentType("income")
    setIncomeForm(initialIncomeForm(incomeMethods[0]?.value))
    setExpenseForm(initialExpenseForm(expenseMethods[0]?.value, expenseCategories[0]?.value))
  }

  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    if (editing) {
      if (editing.type === "income") {
        const raw = editing.raw as any
        setPaymentType("income")
        setIncomeForm({
          clientId: String(raw.clientId?._id || raw.clientId || ""),
          orderId: String(raw.orderId?._id || raw.orderId || ""),
          customerName: editing.party || "",
          phoneNumber: raw.phoneNumber || "",
          invoiceNumber: editing.invoiceNumber || "",
          totalAmount: String(editing.totalAmount ?? raw.totalAmount ?? ""),
          alreadyPaid: String(
            Math.max(
              0,
              toSafeNumber(raw.totalAmount, 0) -
                toSafeNumber(raw.discount, 0) -
                toSafeNumber(raw.remainingBalance, 0) -
                toSafeNumber(raw.amountPaid, 0)
            )
          ),
          remainingBalance: String(editing.remainingBalance ?? ""),
          amountPaid: String(editing.amount ?? ""),
          discount: String(raw.discount ?? "0"),
          dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString().split("T")[0] : "",
          paymentDate: editing.date
            ? new Date(editing.date).toISOString().split("T")[0]
            : initialIncomeForm().paymentDate,
          paymentMethod: editing.paymentMethod || incomeMethods[0]?.value || "cash",
          incomeCategory: editing.category || "laundry_service",
          referenceNumber: editing.referenceNumber || "",
          notes: editing.notes || "",
        })
      } else {
        const raw = editing.raw as any
        setPaymentType("expense")
        setExpenseForm({
          category: editing.category || "",
          title: raw.title || "",
          payee: editing.party === "—" ? "" : editing.party,
          amount: String(editing.amount ?? ""),
          expenseDate: editing.date
            ? new Date(editing.date).toISOString().split("T")[0]
            : initialExpenseForm().expenseDate,
          paymentMethod: editing.paymentMethod || expenseMethods[0]?.value || "cash",
          receiptNumber: editing.receiptNumber || "",
          description: editing.description || editing.notes || "",
          status: editing.status || "paid",
          receiptFileName: editing.receiptFileName || "",
          receiptMimeType: editing.receiptMimeType || "",
          receiptData: editing.receiptData || "",
        })
      }
      return
    }

    reset()
    onLoadOutstanding()
  }, [open, editing])

  const handleIncomeChange = (name: keyof IncomeFormValues, value: string) => {
    if (name === "clientId") {
      const clientOptions = outstandingOptions.filter((o) => String(o.clientId) === value)
      const customer = clientOptions[0]
      setIncomeForm((prev) => ({
        ...prev,
        clientId: value,
        orderId: "",
        customerName: customer?.customerName || "",
        phoneNumber: customer?.phoneNumber || "",
        invoiceNumber: "",
        totalAmount: "",
        alreadyPaid: "",
        remainingBalance: "",
        amountPaid: "",
        discount: "",
        dueDate: "",
        notes: "",
      }))
      return
    }

    if (name === "orderId") {
      const option = outstandingOptions.find((o) => String(o.orderId) === value)
      if (!option) {
        setIncomeForm((prev) => ({ ...prev, orderId: value }))
        return
      }
      setIncomeForm((prev) => ({
        ...prev,
        orderId: value,
        clientId: String(option.clientId),
        customerName: option.customerName,
        phoneNumber: option.phoneNumber || "",
        invoiceNumber: option.invoiceNumber || `INV-${option.orderNumber}`,
        totalAmount: String(option.totalAmount),
        alreadyPaid: String(option.alreadyPaid),
        remainingBalance: String(option.remainingBalance),
        discount: String(option.discount || 0),
        amountPaid: "",
      }))
      return
    }

    setIncomeForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleExpenseChange = (name: keyof ExpenseFormValues, value: string) => {
    setExpenseForm((prev) => ({ ...prev, [name]: value }))
  }

  const title = useMemo(() => {
    if (editing) return `Edit ${editing.type === "income" ? "Income" : "Expense"}`
    return "Record Payment"
  }, [editing])

  const validateIncome = () => {
    if (!incomeForm.clientId) {
      toast.error("Please select a client")
      return false
    }
    if (!incomeForm.orderId) {
      toast.error("Please select an order")
      return false
    }
    if (!incomeForm.customerName.trim()) {
      toast.error("Please enter customer name")
      return false
    }

    const totalAmount = Math.max(0, toSafeNumber(incomeForm.totalAmount, 0))
    const discount = Math.max(0, toSafeNumber(incomeForm.discount, 0))
    const alreadyPaid = Math.max(0, toSafeNumber(incomeForm.alreadyPaid, 0))
    const amount = toSafeNumber(incomeForm.amountPaid, NaN)
    const netTotal = Math.max(0, totalAmount - discount)
    const remaining = Math.max(0, netTotal - alreadyPaid)

    if (discount > totalAmount) {
      toast.error("Discount cannot exceed the total amount")
      return false
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Payment amount must be greater than zero")
      return false
    }
    if (!editing && amount > remaining) {
      toast.error(`Payment cannot exceed remaining balance (${remaining.toFixed(2)})`)
      return false
    }
    return true
  }

  const validateExpense = () => {
    if (!expenseForm.category) {
      toast.error("Please choose an expense type")
      return false
    }
    const amount = toSafeNumber(expenseForm.amount, NaN)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than zero")
      return false
    }
    if (!expenseForm.expenseDate) {
      toast.error("Please select a date")
      return false
    }
    if (!expenseForm.paymentMethod) {
      toast.error("Please choose an account")
      return false
    }
    if (!expenseForm.description.trim()) {
      toast.error("Please enter a description")
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (paymentType === "income") {
      if (!validateIncome()) return
      const ok = editing
        ? await onUpdateIncome(editing.sourceId, incomeForm)
        : await onCreateIncome(incomeForm)
      if (ok) onOpenChange(false)
      return
    }

    if (!validateExpense()) return
    const ok = editing
      ? await onUpdateExpense(editing.sourceId, expenseForm)
      : await onCreateExpense(expenseForm)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] w-[min(92vw,56rem)] max-w-4xl overflow-y-auto p-6 sm:p-7"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (
            target?.closest("[data-radix-select-content]") ||
            target?.closest("[data-radix-popper-content-wrapper]") ||
            target?.closest("[data-radix-select-viewport]")
          ) {
            event.preventDefault()
          }
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (
            target?.closest("[data-radix-select-content]") ||
            target?.closest("[data-radix-popper-content-wrapper]") ||
            target?.closest("[data-radix-select-viewport]")
          ) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Record income collections or business expenses. A unique transaction number is generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Payment Type *</Label>
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
              disabled={Boolean(editing)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[110]">
                {PAYMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentType === "income" ? (
            outstandingLoading && !editing ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading outstanding invoices...</p>
            ) : !editing && outstandingOptions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No outstanding invoices found. Create an order first.
              </p>
            ) : (
              <IncomeForm
                form={incomeForm}
                onChange={handleIncomeChange}
                outstandingOptions={outstandingOptions}
                loading={outstandingLoading}
                editMode={Boolean(editing)}
                paymentMethods={incomeMethods}
                optionsLoading={optionsLoading}
              />
            )
          ) : (
            <ExpenseForm
              form={expenseForm}
              onChange={handleExpenseChange}
              categories={expenseCategories}
              paymentMethods={expenseMethods}
              optionsLoading={optionsLoading}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              <Receipt className="mr-2 h-4 w-4" />
              {editing ? "Save Changes" : paymentType === "income" ? "Record Income" : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
