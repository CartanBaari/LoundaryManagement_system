export type PaymentType = "income" | "expense"

export type TransactionStatus = "paid" | "partial" | "pending" | "unpaid" | "cancelled"

export interface OutstandingOption {
  invoiceId?: string | null
  orderId: string
  orderNumber: string
  invoiceNumber?: string | null
  clientId: string
  customerName: string
  phoneNumber?: string
  totalAmount: number
  discount: number
  alreadyPaid: number
  remainingBalance: number
  status: string
}

export interface IncomeFormValues {
  clientId: string
  orderId: string
  customerName: string
  phoneNumber: string
  invoiceNumber: string
  totalAmount: string
  alreadyPaid: string
  remainingBalance: string
  amountPaid: string
  discount: string
  dueDate: string
  paymentDate: string
  paymentMethod: string
  incomeCategory: string
  referenceNumber: string
  notes: string
}

export interface ExpenseFormValues {
  category: string
  title: string
  payee: string
  amount: string
  expenseDate: string
  paymentMethod: string
  receiptNumber: string
  description: string
  status: string
  receiptFileName: string
  receiptMimeType: string
  receiptData: string
}

export interface PaymentTransaction {
  id: string
  sourceId: string
  transactionNumber: string
  type: PaymentType
  category: string
  categoryLabel: string
  party: string
  amount: number
  paymentMethod: string
  paymentMethodLabel: string
  status: string
  date: string
  notes?: string
  description?: string
  referenceNumber?: string
  receiptNumber?: string
  invoiceNumber?: string
  orderNumber?: string
  remainingBalance?: number
  totalAmount?: number
  receiptFileName?: string
  receiptMimeType?: string
  receiptData?: string
  raw: Record<string, unknown>
}

export interface PaymentFiltersState {
  search: string
  type: "all" | PaymentType
  status: string
  startDate: string
  endDate: string
}

export interface PaymentSummary {
  incomeToday: number
  expenseToday: number
  netProfitToday: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyProfit: number
}
