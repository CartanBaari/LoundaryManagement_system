import { type LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  loading?: boolean
  iconClassName?: string
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel = "vs last period",
  loading,
  iconClassName,
}: StatCardProps) {
  if (loading) {
    return <Skeleton className="h-[148px] rounded-[16px]" />
  }

  const isPositive = change !== undefined && change >= 0

  return (
    <motion.div className="h-full" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className="h-full min-h-[148px] overflow-hidden transition-shadow hover:shadow-elevated">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
              {label}
            </p>
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 sm:h-10 sm:w-10",
                iconClassName
              )}
            >
              <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
          </div>

          <p className="break-words text-xl font-bold tracking-tight text-[#111827] dark:text-foreground sm:text-2xl lg:text-3xl">
            {value}
          </p>

          <div className="flex min-h-[18px] items-center gap-1.5">
            {change !== undefined ? (
              <>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isPositive ? "text-success" : "text-danger"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
                <span className="text-xs font-medium text-muted-foreground">{changeLabel}</span>
              </>
            ) : (
              <span className="text-xs font-medium text-transparent select-none" aria-hidden="true">
                0.0% {changeLabel}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
