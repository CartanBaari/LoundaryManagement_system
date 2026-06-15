import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  })
}

export function toDateInputValue(date: string | Date) {
  const value = new Date(date)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatPaymentStatus(status?: string) {
  const normalized = status?.toLowerCase()
  if (normalized === "paid") return "Paid"
  if (normalized === "failed") return "Failed"
  if (normalized === "partial") return "Partial"
  if (!status || normalized === "pending" || normalized === "unpaid") return "Not Paid"
  return status
}

export function resolveCustomerPaymentStatus(orders: Array<{ paymentStatus?: string }> = []) {
  if (!orders.length) return "N/A"
  const statuses = orders.map((order) => order.paymentStatus || "pending")
  if (statuses.every((status) => status === "paid")) return "paid"
  if (statuses.some((status) => status === "failed")) return "failed"
  if (statuses.some((status) => status !== "paid")) return "pending"
  return "paid"
}

export function getInitials(name?: string) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function formatStaffWorkloadLabel(
  name: string,
  workload?: { assignedCount: number; dailyCapacity: number }
) {
  if (!workload) return name
  return `${name} — ${workload.assignedCount}/${workload.dailyCapacity} orders/day`
}

export function isStaffAtCapacity(workload?: { isAtCapacity?: boolean }) {
  return Boolean(workload?.isAtCapacity)
}
