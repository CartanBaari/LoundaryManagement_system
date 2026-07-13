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

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled"
  if (normalized === "partial" || normalized === "partially_paid") return "Partially Paid"
  if (!status || normalized === "pending" || normalized === "unpaid") return "Pending"
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
  workload?: {
    assignedCount: number
    dailyCapacity: number
    remainingCapacity?: number
  }
) {
  if (!workload) return name
  const remaining =
    workload.remainingCapacity ?? Math.max(0, workload.dailyCapacity - workload.assignedCount)
  return `${name} — ${workload.assignedCount}/${workload.dailyCapacity} assigned, ${remaining} left`
}

export function getStaffRemainingCapacity(workload?: {
  assignedCount: number
  dailyCapacity: number
  remainingCapacity?: number
}) {
  if (!workload) return 0
  return workload.remainingCapacity ?? Math.max(0, workload.dailyCapacity - workload.assignedCount)
}

export function buildStaffPickupDateLoadMap(
  orders: Array<{
    assignedStaff?: { _id?: string }
    pickupDate?: string | Date
    createdAt?: string | Date
    status?: string
  }> = []
) {
  const map = new Map<string, number>()

  orders.forEach((order) => {
    if (!order.assignedStaff?._id || order.status === "delivered" || order.status === "cancelled") {
      return
    }

    const staffId = String(order.assignedStaff._id)
    const dateKey = order.pickupDate ? toDateInputValue(order.pickupDate) : toDateInputValue(order.createdAt || new Date())
    const key = `${staffId}:${dateKey}`
    map.set(key, (map.get(key) || 0) + 1)
  })

  return map
}

export function getStaffCapacityForDate(
  staffId: string,
  dateInput: string | Date,
  loadMap: Map<string, number>,
  staffMembers: Array<{ _id: string; dailyCapacity?: number }> = []
) {
  const dateKey = toDateInputValue(dateInput)
  const key = `${String(staffId)}:${dateKey}`
  const assigned = loadMap.get(key) || 0
  const staff = staffMembers.find((member) => String(member._id) === String(staffId))
  const capacity = staff?.dailyCapacity ?? 10
  const remaining = Math.max(0, capacity - assigned)

  return {
    assigned,
    capacity,
    remaining,
    isAtCapacity: assigned >= capacity,
  }
}

export function isStaffAtCapacity(workload?: { isAtCapacity?: boolean; remainingCapacity?: number; assignedCount?: number; dailyCapacity?: number }) {
  if (!workload) return false
  if (workload.isAtCapacity) return true
  if (
    workload.assignedCount !== undefined &&
    workload.dailyCapacity !== undefined &&
    workload.assignedCount >= workload.dailyCapacity
  ) {
    return true
  }
  return getStaffRemainingCapacity(workload) <= 0
}

export function generateAccountPassword(length = 12) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lowercase = "abcdefghjkmnpqrstuvwxyz"
  const numbers = "23456789"
  const symbols = "@#$%&*"
  const all = `${uppercase}${lowercase}${numbers}${symbols}`

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)]
  const required = [pick(uppercase), pick(lowercase), pick(numbers), pick(symbols)]
  const remaining = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all))

  return [...required, ...remaining]
    .sort(() => Math.random() - 0.5)
    .join("")
}
