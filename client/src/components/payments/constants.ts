export const INCOME_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "evc_plus", label: "EVC Plus" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "zaad", label: "Zaad" },
  { value: "sahal", label: "Sahal" },
  { value: "edahab", label: "Edahab" },
  { value: "cheque", label: "Cheque" },
] as const

export const EXPENSE_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "evc_plus", label: "EVC Plus" },
  { value: "zaad", label: "Zaad" },
  { value: "sahal", label: "Sahal" },
  { value: "edahab", label: "Edahab" },
  { value: "cheque", label: "Cheque" },
] as const

export const INCOME_CATEGORIES = [
  { value: "laundry_service", label: "Laundry Service" },
  { value: "dry_cleaning", label: "Dry Cleaning" },
  { value: "ironing", label: "Ironing" },
  { value: "delivery_fee", label: "Delivery Fee" },
  { value: "pickup_fee", label: "Pickup Fee" },
  { value: "membership", label: "Membership" },
  { value: "other_income", label: "Other Income" },
] as const

export const EXPENSE_CATEGORIES = [
  { value: "detergent", label: "Detergent" },
  { value: "softener", label: "Softener" },
  { value: "plastic_bags", label: "Plastic Bags" },
  { value: "fuel", label: "Fuel" },
  { value: "electricity", label: "Electricity" },
  { value: "water_bill", label: "Water Bill" },
  { value: "internet", label: "Internet" },
  { value: "rent", label: "Rent" },
  { value: "salary", label: "Salary" },
  { value: "equipment", label: "Equipment" },
  { value: "maintenance", label: "Maintenance" },
  { value: "marketing", label: "Marketing" },
  { value: "transportation", label: "Transportation" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "other", label: "Other" },
] as const

export const EXPENSE_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
] as const

export const PAYMENT_TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partially Paid" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
] as const

export const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const

const METHOD_ALIASES: Record<string, string> = {
  mobile_money: "evc_plus",
  bank: "bank_transfer",
}

const LEGACY_EXPENSE_CATEGORIES: Record<string, string> = {
  staff_payment: "Salary",
  supplier_payment: "Other",
  maintenance_payment: "Maintenance",
}

export function labelForMethod(value?: string) {
  if (!value) return "N/A"
  const labels: Record<string, string> = {
    cash: "Cash",
    mobile_money: "Mobile Money",
    bank: "Bank",
    evc_plus: "EVC Plus",
    bank_transfer: "Bank Transfer",
    zaad: "Zaad",
    sahal: "Sahal",
    edahab: "Edahab",
    cheque: "Cheque",
  }
  const normalized = METHOD_ALIASES[value] || value
  return labels[value] || labels[normalized] || value
}

export function labelForIncomeCategory(value?: string) {
  if (!value) return "Laundry Service"
  return INCOME_CATEGORIES.find((c) => c.value === value)?.label || value
}

export function labelForExpenseCategory(value?: string) {
  if (!value) return "Other"
  if (LEGACY_EXPENSE_CATEGORIES[value]) return LEGACY_EXPENSE_CATEGORIES[value]
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value
}

export function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function resolveIncomeStatus(amountPaid: number, invoiceTotal: number) {
  if (amountPaid <= 0) return "pending"
  if (amountPaid >= invoiceTotal) return "paid"
  return "partial"
}

export function fileToBase64(file: File): Promise<{ data: string; name: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        data: String(reader.result || ""),
        name: file.name,
        mimeType: file.type,
      })
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}
