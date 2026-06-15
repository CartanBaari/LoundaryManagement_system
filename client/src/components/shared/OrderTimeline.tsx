import { CheckCircle, Circle, Clock, Package } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "washing", label: "Washing", icon: Package },
  { key: "drying", label: "Drying", icon: Package },
  { key: "ready", label: "Ready", icon: Package },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
]

const STATUS_ORDER = ["pending", "washing", "drying", "ready", "delivered"]

interface OrderTimelineProps {
  status: string
}

export default function OrderTimeline({ status }: OrderTimelineProps) {
  const normalized = status?.toLowerCase() || "pending"
  const isCancelled = normalized === "cancelled"
  const currentIndex = STATUS_ORDER.indexOf(normalized)

  if (isCancelled) {
    return (
      <div className="rounded-[10px] border border-destructive/20 bg-destructive/5 p-4 text-center text-sm font-medium text-destructive">
        Order Cancelled
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = currentIndex >= index
        const isCurrent = currentIndex === index
        const Icon = step.icon

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-white"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Icon className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </div>
              {index < STATUS_STEPS.length - 1 && (
                <div
                  className={cn(
                    "my-1 min-h-[24px] w-0.5 flex-1",
                    isCompleted && currentIndex > index ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {isCurrent && <p className="text-xs text-muted-foreground">Current step</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
