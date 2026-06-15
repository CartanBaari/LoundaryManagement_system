import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: LucideIcon
}

export default function PageHeader({ title, description, action, icon: Icon }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">{title}</h2>
        </div>
        {description && <p className="text-sm font-medium text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[16px] bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-[#111827] dark:text-foreground">{title}</h3>
      <p className="mb-6 max-w-sm text-sm font-medium text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}
