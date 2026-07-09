import { Badge, type BadgeProps } from "@/components/ui/badge"
import { formatPaymentStatus } from "@/lib/utils"

const statusMap: Record<string, BadgeProps["variant"]> = {
  pending: "pending",
  processing: "processing",
  washing: "processing",
  drying: "processing",
  ready: "processing",
  completed: "completed",
  delivered: "completed",
  cancelled: "cancelled",
  paid: "paid",
  refunded: "refunded",
  active: "success",
  inactive: "secondary",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || "pending"
  const variant = statusMap[normalized] || "secondary"

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()
  const label = formatPaymentStatus(status)
  const variant =
    normalized === "paid" || normalized === "completed"
      ? "paid"
      : normalized === "failed" || normalized === "refunded"
        ? "refunded"
        : normalized === "partial" || normalized === "partially_paid"
          ? "processing"
          : "pending"

  if (label === "N/A") {
    return <Badge variant="secondary">N/A</Badge>
  }

  return <Badge variant={variant}>{label}</Badge>
}
