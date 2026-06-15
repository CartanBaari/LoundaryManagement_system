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
    return <Skeleton className="h-[132px] rounded-[16px]" />
  }

  const isPositive = change !== undefined && change >= 0

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden transition-shadow hover:shadow-elevated">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold tracking-tight text-[#111827] dark:text-foreground">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1.5">
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
                </div>
              )}
            </div>
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary/10", iconClassName)}>
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
