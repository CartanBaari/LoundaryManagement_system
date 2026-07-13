import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import StatCard from "@/components/shared/StatCard"
import { formatCurrency } from "@/lib/utils"
import type { PaymentSummary } from "@/components/payments/types"

interface SummaryCardsProps {
  summary: PaymentSummary
  loading?: boolean
}

export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <StatCard
        label="Total Income Today"
        value={formatCurrency(summary.incomeToday)}
        icon={ArrowDownCircle}
        loading={loading}
        iconClassName="bg-emerald-500/10"
      />
      <StatCard
        label="Total Expense Today"
        value={formatCurrency(summary.expenseToday)}
        icon={ArrowUpCircle}
        loading={loading}
        iconClassName="bg-rose-500/10"
      />
      <StatCard
        label="Net Profit Today"
        value={formatCurrency(summary.netProfitToday)}
        icon={Wallet}
        loading={loading}
        iconClassName="bg-sky-500/10"
      />
      <StatCard
        label="Monthly Income"
        value={formatCurrency(summary.monthlyIncome)}
        icon={TrendingUp}
        loading={loading}
        iconClassName="bg-emerald-500/10"
      />
      <StatCard
        label="Monthly Expense"
        value={formatCurrency(summary.monthlyExpense)}
        icon={TrendingDown}
        loading={loading}
        iconClassName="bg-rose-500/10"
      />
      <StatCard
        label="Monthly Profit"
        value={formatCurrency(summary.monthlyProfit)}
        icon={CalendarRange}
        loading={loading}
        iconClassName="bg-indigo-500/10"
      />
    </div>
  )
}
