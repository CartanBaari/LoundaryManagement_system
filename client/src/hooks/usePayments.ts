import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { expenseAPI, paymentAPI } from "@/services/api"
import { toSafeNumber } from "@/components/payments/constants"
import { labelFromOptions, usePaymentOptions } from "@/hooks/usePaymentOptions"
import { notifyFinanceUpdated } from "@/lib/financeEvents"
import type {
  ExpenseFormValues,
  IncomeFormValues,
  OutstandingOption,
  PaymentFiltersState,
  PaymentSummary,
  PaymentTransaction,
} from "@/components/payments/types"

const todayInput = () => new Date().toISOString().split("T")[0]

export const initialIncomeForm = (defaultMethod = "cash"): IncomeFormValues => ({
  clientId: "",
  orderId: "",
  customerName: "",
  phoneNumber: "",
  invoiceNumber: "",
  totalAmount: "",
  alreadyPaid: "",
  remainingBalance: "",
  amountPaid: "",
  discount: "",
  dueDate: "",
  paymentDate: todayInput(),
  paymentMethod: defaultMethod,
  incomeCategory: "laundry_service",
  referenceNumber: "",
  notes: "",
})

export const initialExpenseForm = (
  defaultMethod = "cash",
  defaultCategory = ""
): ExpenseFormValues => ({
  category: defaultCategory,
  title: "",
  payee: "",
  amount: "",
  expenseDate: todayInput(),
  paymentMethod: defaultMethod,
  receiptNumber: "",
  description: "",
  status: "paid",
  receiptFileName: "",
  receiptMimeType: "",
  receiptData: "",
})

const initialFilters = (): PaymentFiltersState => ({
  search: "",
  type: "all",
  status: "all",
  startDate: "",
  endDate: "",
})

const mapIncomeStatus = (status?: string) => {
  if (status === "partial" || status === "partially_paid") return "partial"
  if (status === "paid") return "paid"
  return "pending"
}

const mapPaymentToTransaction = (
  payment: any,
  methodOptions: Array<{ value: string; label: string }> = []
): PaymentTransaction => ({
  id: `income-${payment._id}`,
  sourceId: payment._id,
  transactionNumber: payment.transactionNumber || payment.paymentId || "—",
  type: "income",
  category: payment.incomeCategory || "laundry_service",
  categoryLabel: labelFromOptions([], payment.incomeCategory, "Laundry Service"),
  party: payment.customerName || payment.clientId?.name || "N/A",
  amount: toSafeNumber(payment.amountPaid, 0),
  paymentMethod: payment.paymentMethod,
  paymentMethodLabel: labelFromOptions(methodOptions, payment.paymentMethod),
  status: mapIncomeStatus(payment.status),
  date: payment.paymentDate,
  notes: payment.notes,
  referenceNumber: payment.referenceNumber,
  invoiceNumber: payment.invoiceId?.invoiceNumber,
  orderNumber: payment.orderId?.orderNumber,
  remainingBalance: toSafeNumber(payment.remainingBalance, 0),
  totalAmount: toSafeNumber(payment.totalAmount, 0),
  raw: payment,
})

const mapExpenseToTransaction = (
  expense: any,
  methodOptions: Array<{ value: string; label: string }> = [],
  categoryOptions: Array<{ value: string; label: string }> = []
): PaymentTransaction => ({
  id: `expense-${expense._id}`,
  sourceId: expense._id,
  transactionNumber: expense.transactionNumber || "—",
  type: "expense",
  category: expense.category,
  categoryLabel: labelFromOptions(categoryOptions, expense.category),
  party: expense.payee || "—",
  amount: toSafeNumber(expense.amount, 0),
  paymentMethod: expense.paymentMethod,
  paymentMethodLabel: labelFromOptions(methodOptions, expense.paymentMethod),
  status: expense.status || "paid",
  date: expense.expenseDate,
  notes: expense.notes,
  description: expense.description,
  receiptNumber: expense.receiptNumber,
  receiptFileName: expense.receiptFileName,
  receiptMimeType: expense.receiptMimeType,
  receiptData: expense.receiptData,
  raw: expense,
})

const isSameDay = (value?: string | Date, reference = new Date()) => {
  if (!value) return false
  return new Date(value).toDateString() === reference.toDateString()
}

const isSameMonth = (value?: string | Date, reference = new Date()) => {
  if (!value) return false
  const date = new Date(value)
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
}

export function usePayments({ isAdmin }: { isAdmin: boolean }) {
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [outstandingOptions, setOutstandingOptions] = useState<OutstandingOption[]>([])
  const [paymentStats, setPaymentStats] = useState<any>(null)
  const [expenseStats, setExpenseStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [outstandingLoading, setOutstandingLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState<PaymentFiltersState>(initialFilters)
  const { allMethods, expenseCategories } = usePaymentOptions({ enabled: true })

  const loadOutstandingOptions = useCallback(async () => {
    setOutstandingLoading(true)
    try {
      const response = await paymentAPI.getOutstanding()
      setOutstandingOptions(response.data?.options || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load outstanding invoices")
      setOutstandingOptions([])
    } finally {
      setOutstandingLoading(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const requests: Promise<any>[] = [paymentAPI.getAll(), paymentAPI.getStats()]
      if (isAdmin) {
        requests.push(expenseAPI.getAll(), expenseAPI.getStats())
      }

      const [paymentsResponse, statsResponse, expensesResponse, expenseStatsResponse] =
        await Promise.all(requests)

      setPayments(paymentsResponse.data?.payments || [])
      setPaymentStats(statsResponse.data?.stats || null)
      setExpenses(expensesResponse?.data?.expenses || [])
      setExpenseStats(expenseStatsResponse?.data?.stats || null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load payments data")
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  const transactions = useMemo<PaymentTransaction[]>(() => {
    const incomeRows = payments.map((payment) => mapPaymentToTransaction(payment, allMethods))
    const expenseRows = isAdmin
      ? expenses.map((expense) => mapExpenseToTransaction(expense, allMethods, expenseCategories))
      : []
    return [...incomeRows, ...expenseRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [payments, expenses, isAdmin, allMethods, expenseCategories])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((row) => {
      if (filters.type !== "all" && row.type !== filters.type) return false

      if (filters.status !== "all") {
        if (filters.status === "pending") {
          if (!(row.status === "pending" || row.status === "unpaid")) return false
        } else if (row.status !== filters.status) {
          return false
        }
      }

      if (filters.startDate) {
        if (new Date(row.date) < new Date(`${filters.startDate}T00:00:00`)) return false
      }
      if (filters.endDate) {
        if (new Date(row.date) > new Date(`${filters.endDate}T23:59:59`)) return false
      }

      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase()
        const haystack = [
          row.transactionNumber,
          row.type,
          row.categoryLabel,
          row.party,
          row.paymentMethodLabel,
          row.status,
          row.invoiceNumber,
          row.orderNumber,
          row.referenceNumber,
          row.receiptNumber,
          row.notes,
          row.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [transactions, filters])

  const summary = useMemo<PaymentSummary>(() => {
    // Always derive from loaded rows so cards update immediately after create/update/delete
    const incomeToday = payments
      .filter((p) => isSameDay(p.paymentDate))
      .reduce((sum, p) => sum + toSafeNumber(p.amountPaid, 0), 0)

    const expenseToday = expenses
      .filter((e) => e.status !== "cancelled" && isSameDay(e.expenseDate))
      .reduce((sum, e) => sum + toSafeNumber(e.amount, 0), 0)

    const monthlyIncome = payments
      .filter((p) => isSameMonth(p.paymentDate))
      .reduce((sum, p) => sum + toSafeNumber(p.amountPaid, 0), 0)

    const monthlyExpense = expenses
      .filter((e) => e.status !== "cancelled" && isSameMonth(e.expenseDate))
      .reduce((sum, e) => sum + toSafeNumber(e.amount, 0), 0)

    return {
      incomeToday,
      expenseToday,
      netProfitToday: incomeToday - expenseToday,
      monthlyIncome,
      monthlyExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
    }
  }, [payments, expenses])

  const createIncome = async (form: IncomeFormValues) => {
    setSubmitting(true)
    try {
      const payload = {
        clientId: form.clientId,
        orderId: form.orderId,
        customerName: form.customerName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        totalAmount: toSafeNumber(form.totalAmount, 0),
        amountPaid: toSafeNumber(form.amountPaid, 0),
        discount: toSafeNumber(form.discount, 0),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        incomeCategory: form.incomeCategory || "laundry_service",
        referenceNumber: form.referenceNumber?.trim?.() || "",
        notes: form.notes.trim(),
      }
      const response = await paymentAPI.create(payload)
      toast.success(
        `Income recorded (${response.data?.payment?.transactionNumber || response.data?.payment?.paymentId || "Saved"})`
      )
      setFilters((prev) => ({ ...prev, type: "income" }))
      await loadData()
      notifyFinanceUpdated({ type: "income", action: "create" })
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record income")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const updateIncome = async (id: string, form: Partial<IncomeFormValues> & { amountPaid?: string }) => {
    setSubmitting(true)
    try {
      await paymentAPI.update(id, {
        amountPaid: form.amountPaid !== undefined ? toSafeNumber(form.amountPaid, 0) : undefined,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        incomeCategory: form.incomeCategory,
        referenceNumber: form.referenceNumber?.trim(),
        notes: form.notes?.trim(),
        customerName: form.customerName?.trim(),
      })
      toast.success("Income payment updated")
      setFilters((prev) => ({ ...prev, type: "income" }))
      await loadData()
      notifyFinanceUpdated({ type: "income", action: "update" })
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update payment")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const createExpense = async (form: ExpenseFormValues) => {
    setSubmitting(true)
    try {
      const title = form.title.trim() || form.category
      await expenseAPI.create({
        title,
        amount: toSafeNumber(form.amount, 0),
        category: form.category,
        payee: form.payee?.trim?.() || "",
        paymentMethod: form.paymentMethod,
        expenseDate: form.expenseDate,
        status: form.status || "paid",
        receiptNumber: form.receiptNumber?.trim?.() || "",
        description: form.description.trim(),
        notes: form.description.trim(),
        receiptFileName: form.receiptFileName || "",
        receiptMimeType: form.receiptMimeType || "",
        receiptData: form.receiptData || "",
      })
      toast.success("Expense recorded successfully")
      setFilters((prev) => ({ ...prev, type: "expense", status: "all" }))
      await loadData()
      notifyFinanceUpdated({ type: "expense", action: "create" })
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record expense")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const updateExpense = async (id: string, form: ExpenseFormValues) => {
    setSubmitting(true)
    try {
      const title = form.title.trim() || form.category
      await expenseAPI.update(id, {
        title,
        amount: toSafeNumber(form.amount, 0),
        category: form.category,
        payee: form.payee?.trim?.() || "",
        paymentMethod: form.paymentMethod,
        expenseDate: form.expenseDate,
        status: form.status || "paid",
        receiptNumber: form.receiptNumber?.trim?.() || "",
        description: form.description.trim(),
        notes: form.description.trim(),
        receiptFileName: form.receiptFileName || "",
        receiptMimeType: form.receiptMimeType || "",
        receiptData: form.receiptData || "",
      })
      toast.success("Expense updated successfully")
      setFilters((prev) => ({ ...prev, type: "expense" }))
      await loadData()
      notifyFinanceUpdated({ type: "expense", action: "update" })
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update expense")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const deleteTransaction = async (transaction: PaymentTransaction) => {
    try {
      if (transaction.type === "income") {
        await paymentAPI.delete(transaction.sourceId)
      } else {
        await expenseAPI.delete(transaction.sourceId)
      }
      toast.success("Transaction deleted")
      await loadData()
      notifyFinanceUpdated({ type: transaction.type, action: "delete" })
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete transaction")
      return false
    }
  }

  return {
    loading,
    submitting,
    outstandingLoading,
    outstandingOptions,
    filters,
    setFilters,
    summary,
    transactions: filteredTransactions,
    allTransactions: transactions,
    loadData,
    loadOutstandingOptions,
    createIncome,
    updateIncome,
    createExpense,
    updateExpense,
    deleteTransaction,
  }
}
