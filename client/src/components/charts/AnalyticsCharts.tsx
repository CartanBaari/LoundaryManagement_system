import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHART_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#8B5CF6"]

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const chartTooltipStyle = {
  contentStyle: {
    borderRadius: "10px",
    border: "1px solid #E5E7EB",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
    fontSize: "13px",
    fontWeight: 500,
  },
}

interface RevenueTrendChartProps {
  data: { date: string; revenue: number }[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <ChartCard title="Revenue Trend" description="Daily revenue over selected period">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipStyle} />
          <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: "#4F46E5", r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface MonthlyOrdersChartProps {
  data: { month: string; orders: number }[]
}

export function MonthlyOrdersChart({ data }: MonthlyOrdersChartProps) {
  return (
    <ChartCard title="Monthly Orders" description="Order volume by month">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipStyle} />
          <Bar dataKey="orders" fill="#4F46E5" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface OrderStatusChartProps {
  data: { name: string; value: number }[]
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  return (
    <ChartCard title="Order Status" description="Distribution by status">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...chartTooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface TopServicesChartProps {
  data: { name: string; count: number }[]
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  return (
    <ChartCard title="Top Services" description="Most popular services">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} width={100} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipStyle} />
          <Bar dataKey="count" fill="#10B981" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface PaymentMethodsChartProps {
  data: { name: string; value: number }[]
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  return (
    <ChartCard title="Payment Methods" description="Breakdown by payment type">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={110} paddingAngle={3} dataKey="value">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...chartTooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface CustomerGrowthChartProps {
  data: { month: string; customers: number }[]
}

export function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
  return (
    <ChartCard title="Customer Growth" description="New customers over time">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltipStyle} />
          <Line type="monotone" dataKey="customers" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export { CHART_COLORS }
