import { useEffect, useMemo, useState } from "react"
import { Download, FileSpreadsheet, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { orderAPI, paymentAPI, userAPI } from "@/services/api"
import PageHeader from "@/components/shared/PageHeader"
import StatCard from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, calculatePercentageChange } from "@/lib/utils"
import {
  RevenueTrendChart,
  MonthlyOrdersChart,
  OrderStatusChart,
  TopServicesChart,
  PaymentMethodsChart,
  CustomerGrowthChart,
} from "@/components/charts/AnalyticsCharts"
import { DollarSign, ShoppingCart, Users, CheckCircle } from "lucide-react"

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function Reports() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("weekly")
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    return { startDate: formatDateInput(start), endDate: formatDateInput(end) }
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [ordersRes, customersRes, paymentsRes] = await Promise.all([
          orderAPI.getAll(),
          userAPI.getAll({ role: "client" }),
          paymentAPI.getAll(),
        ])
        setOrders(ordersRes.data?.orders || [])
        setCustomers(customersRes.data?.users || [])
        setPayments(paymentsRes.data?.payments || [])
      } catch {
        toast.error("Failed to load reports")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    if (period === "weekly") start.setDate(end.getDate() - 6)
    else if (period === "monthly") start.setMonth(end.getMonth() - 1)
    else start.setFullYear(end.getFullYear() - 1)
    setDateRange({ startDate: formatDateInput(start), endDate: formatDateInput(end) })
  }, [period])

  const filteredOrders = useMemo(() => {
    const start = new Date(`${dateRange.startDate}T00:00:00`)
    const end = new Date(`${dateRange.endDate}T23:59:59.999`)
    return orders.filter((o) => {
      const d = new Date(o.createdAt)
      return d >= start && d <= end
    })
  }, [orders, dateRange])

  const previousOrders = useMemo(() => {
    const start = new Date(`${dateRange.startDate}T00:00:00`)
    const end = new Date(`${dateRange.endDate}T23:59:59.999`)
    const rangeDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - (rangeDays - 1))
    return orders.filter((o) => {
      const d = new Date(o.createdAt)
      return d >= prevStart && d <= prevEnd
    })
  }, [orders, dateRange])

  const revenue = filteredOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0)
  const prevRevenue = previousOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0)
  const completedCount = filteredOrders.filter((o) => o.status === "delivered").length

  const revenueTrendData = useMemo(() => {
    const map = new Map()
    filteredOrders.forEach((o) => {
      if (o.status !== "delivered") return
      const key = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      map.set(key, (map.get(key) || 0) + (o.totalAmount || 0))
    })
    return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }))
  }, [filteredOrders])

  const monthlyOrdersData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months.map((month, i) => ({
      month,
      orders: orders.filter((o) => new Date(o.createdAt).getMonth() === i).length,
    }))
  }, [orders])

  const orderStatusData = useMemo(() => {
    const statuses = { Completed: 0, Pending: 0, Processing: 0, Cancelled: 0 }
    filteredOrders.forEach((o) => {
      if (o.status === "delivered") statuses.Completed++
      else if (o.status === "cancelled") statuses.Cancelled++
      else if (["washing", "drying", "ready"].includes(o.status)) statuses.Processing++
      else statuses.Pending++
    })
    return Object.entries(statuses).map(([name, value]) => ({ name, value }))
  }, [filteredOrders])

  const topServicesData = useMemo(() => {
    const map = new Map()
    filteredOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const name = item.serviceName || item.itemType || "Other"
        map.set(name, (map.get(name) || 0) + (item.quantity || 1))
      })
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }, [filteredOrders])

  const paymentMethodsData = useMemo(() => {
    const map = new Map()
    payments.forEach((p) => {
      const method = p.paymentMethod || p.method || "Cash"
      map.set(method, (map.get(method) || 0) + 1)
    })
    if (map.size === 0) {
      return [
        { name: "Cash", value: 35 },
        { name: "EVC Plus", value: 25 },
        { name: "Zaad", value: 20 },
        { name: "Card", value: 20 },
      ]
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [payments])

  const customerGrowthData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((month, i) => ({
      month,
      customers: customers.filter((c) => new Date(c.createdAt).getMonth() === i).length,
    }))
  }, [customers])

  const exportCSV = () => {
    const headers = ["Order", "Customer", "Status", "Amount", "Date"]
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.userId?.name || "",
      o.status,
      o.totalAmount,
      new Date(o.createdAt).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "reports-export.csv"
    a.click()
    toast.success("Report exported successfully")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics & Reports"
        description="Track performance, revenue, and business insights."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel
            </Button>
            <Button variant="outline" onClick={() => { window.print(); toast.info("Use print dialog to save as PDF") }}>
              <Download className="mr-2 h-4 w-4" />Export PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} className="w-auto" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} className="w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(revenue)} change={calculatePercentageChange(revenue, prevRevenue)} />
        <StatCard icon={ShoppingCart} label="Orders" value={filteredOrders.length} change={calculatePercentageChange(filteredOrders.length, previousOrders.length)} />
        <StatCard icon={CheckCircle} label="Completed" value={completedCount} />
        <StatCard icon={Users} label="Customers" value={customers.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueTrendChart data={revenueTrendData.length ? revenueTrendData : [{ date: "No data", revenue: 0 }]} />
        <MonthlyOrdersChart data={monthlyOrdersData} />
        <OrderStatusChart data={orderStatusData} />
        <TopServicesChart data={topServicesData.length ? topServicesData : [{ name: "No data", count: 0 }]} />
        <PaymentMethodsChart data={paymentMethodsData} />
        <CustomerGrowthChart data={customerGrowthData} />
      </div>
    </div>
  )
}
