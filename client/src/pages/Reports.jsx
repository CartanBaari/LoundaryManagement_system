import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Search,
  FileSpreadsheet,
  CalendarDays,
  ShoppingBag,
  CheckCircle2,
  Users,
  UserCog,
  MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { orderAPI, userAPI } from '../services/api';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    };
  });

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);

        const [ordersResponse, customersResponse, staffResponse] = await Promise.all([
          orderAPI.getAll(),
          userAPI.getAll({ role: 'client' }),
          userAPI.getStaff(),
        ]);

        setOrders(ordersResponse.data?.orders || []);
        setCustomers(customersResponse.data?.users || []);
        setStaffMembers(staffResponse.data?.staffMembers || []);
      } catch (error) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  const filteredOrders = useMemo(() => {
    const start = new Date(`${dateRange.startDate}T00:00:00`);
    const end = new Date(`${dateRange.endDate}T23:59:59.999`);

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= start && createdAt <= end;
    });
  }, [dateRange.endDate, dateRange.startDate, orders]);

  const previousPeriodOrders = useMemo(() => {
    const start = new Date(`${dateRange.startDate}T00:00:00`);
    const end = new Date(`${dateRange.endDate}T23:59:59.999`);
    const rangeLength = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
    const previousEnd = new Date(start);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - (rangeLength - 1));

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= previousStart && createdAt <= previousEnd;
    });
  }, [dateRange.endDate, dateRange.startDate, orders]);

  const getChangeText = (currentValue, previousValue) => {
    if (previousValue === 0) {
      return currentValue > 0 ? '+100%' : '0%';
    }

    const percentage = ((currentValue - previousValue) / previousValue) * 100;
    const prefix = percentage >= 0 ? '+' : '';
    return `${prefix}${percentage.toFixed(1)}%`;
  };

  const lastSevenDays = useMemo(() => {
    const start = new Date(`${dateRange.startDate}T00:00:00`);
    const end = new Date(`${dateRange.endDate}T00:00:00`);
    const totalDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
    const dayCount = Math.min(totalDays, 7);
    const chartStart = new Date(end);
    chartStart.setDate(end.getDate() - (dayCount - 1));

    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + index);
      const dayLabel = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const dayOrders = filteredOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt.toDateString() === date.toDateString();
      });

      return {
        label: dayLabel,
        orders: dayOrders.length,
        customers: new Set(dayOrders.map((order) => order.userId?._id).filter(Boolean)).size,
      };
    });

    return days;
  }, [dateRange.endDate, dateRange.startDate, filteredOrders]);

  const workflowOverview = useMemo(() => {
    return lastSevenDays.map((day) => {
      const dayOrders = filteredOrders.filter((order) => {
        const createdAtLabel = new Date(order.createdAt).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        });
        return createdAtLabel === day.label;
      });
      const active = dayOrders.filter((order) => ['pending', 'washing', 'drying', 'ready'].includes(order.status)).length;
      const delivered = dayOrders.filter((order) => order.status === 'delivered').length;

      return {
        label: day.label,
        active,
        delivered,
      };
    });
  }, [filteredOrders, lastSevenDays]);

  const topStats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalCustomers = new Set(filteredOrders.map((order) => order.userId?._id).filter(Boolean)).size;
    const garmentsLogged = filteredOrders.reduce(
      (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
      0
    );
    const assignedStaff = new Set(filteredOrders.map((order) => order.assignedStaff?._id).filter(Boolean)).size;
    const previousOrdersCount = previousPeriodOrders.length;
    const previousCustomerCount = new Set(previousPeriodOrders.map((order) => order.userId?._id).filter(Boolean)).size;
    const previousGarmentsLogged = previousPeriodOrders.reduce(
      (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
      0
    );
    const previousAssignedStaff = new Set(previousPeriodOrders.map((order) => order.assignedStaff?._id).filter(Boolean))
      .size;

    return [
      {
        label: 'Orders received',
        value: String(totalOrders),
        change: getChangeText(totalOrders, previousOrdersCount),
        accent: 'text-emerald-600',
        iconBg: 'bg-emerald-100 text-emerald-600',
        icon: ShoppingBag,
      },
      {
        label: 'Customers served',
        value: String(totalCustomers),
        change: getChangeText(totalCustomers, previousCustomerCount),
        accent: 'text-violet-600',
        iconBg: 'bg-violet-100 text-violet-600',
        icon: Users,
      },
      {
        label: 'Garments logged',
        value: String(garmentsLogged),
        change: getChangeText(garmentsLogged, previousGarmentsLogged),
        accent: 'text-amber-500',
        iconBg: 'bg-amber-100 text-amber-500',
        icon: CheckCircle2,
      },
      {
        label: 'Assigned staff',
        value: String(assignedStaff),
        change: getChangeText(assignedStaff, previousAssignedStaff),
        accent: 'text-blue-600',
        iconBg: 'bg-blue-100 text-blue-600',
        icon: UserCog,
        negative: assignedStaff < previousAssignedStaff,
      },
    ];
  }, [filteredOrders, previousPeriodOrders]);

  const peakOrderTime = useMemo(() => {
    const hourMap = new Map();

    filteredOrders.forEach((order) => {
      const hourLabel = new Date(order.createdAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      });
      hourMap.set(hourLabel, (hourMap.get(hourLabel) || 0) + 1);
    });

    const topHour = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0];
    return topHour ? `${topHour[0]} (${topHour[1]} orders)` : 'No peak time yet';
  }, [filteredOrders]);

  const topOrderDay = useMemo(() => {
    const dayMap = new Map();

    filteredOrders.forEach((order) => {
      const dayLabel = new Date(order.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      dayMap.set(dayLabel, (dayMap.get(dayLabel) || 0) + 1);
    });

    const topDay = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0];
    return topDay ? `${topDay[0]} (${topDay[1]} orders)` : 'No top day yet';
  }, [filteredOrders]);

  const filteredReportOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const rows = filteredOrders
      .map((order) => {
        const customerName = order.userId?.name || 'Unknown customer';
        const assignedStaffName = order.assignedStaff?.name || 'Unassigned';
        const garments = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const orderTypes = Array.from(
          new Set(
            (order.items || []).map((item) => String(item.serviceName || item.itemType || 'Other'))
          )
        ).join(', ');

        return {
          id: order._id,
          orderNumber: order.orderNumber || 'N/A',
          customerName,
          orderTypes: orderTypes || 'Other',
          garments,
          status: order.status || 'pending',
          assignedStaffName,
          totalAmount: Number(order.totalAmount || 0),
          createdAt: order.createdAt,
          pickupDate: order.pickupDate,
          deliveryDate: order.deliveryDate,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      row.orderNumber.toLowerCase().includes(query) ||
      row.customerName.toLowerCase().includes(query) ||
      row.orderTypes.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query) ||
      row.assignedStaffName.toLowerCase().includes(query)
    );
  }, [filteredOrders, searchTerm]);

  const handleExportBundle = () => {
    if (!filteredReportOrders.length) {
      toast.error('No report data available to export');
      return;
    }

    const header = ['Order Number', 'Customer', 'Order Types', 'Garments', 'Status', 'Assigned Staff', 'Amount', 'Pickup Date', 'Delivery Date'];
    const lines = filteredReportOrders.map((row) => [
      row.orderNumber,
      row.customerName,
      row.orderTypes,
      row.garments,
      row.status,
      row.assignedStaffName,
      row.totalAmount.toFixed(2),
      row.pickupDate ? new Date(row.pickupDate).toLocaleDateString('en-GB') : 'N/A',
      row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString('en-GB') : 'N/A',
    ]);

    const csv = [header, ...lines]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'laundry-report-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Report bundle exported successfully');
  };

  const handleCreateReport = () => {
    toast.success('Live report library refreshes automatically from your data');
  };

  const maxOrders = Math.max(...lastSevenDays.map((day) => day.orders), 1);
  const maxCustomers = Math.max(...lastSevenDays.map((day) => day.customers), 1);
  const maxOverviewActive = Math.max(...workflowOverview.map((day) => day.active), 1);
  const maxOverviewDelivered = Math.max(...workflowOverview.map((day) => day.delivered), 1);

  const activePoints = workflowOverview
    .map((day, index) => {
      const x = (index / Math.max(workflowOverview.length - 1, 1)) * 100;
      const y = 100 - (day.active / maxOverviewActive) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const deliveredPoints = workflowOverview
    .map((day, index) => {
      const x = (index / Math.max(workflowOverview.length - 1, 1)) * 100;
      const y = 100 - (day.delivered / maxOverviewDelivered) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const statusPillClass = (status) => {
    if (status === 'delivered') {
      return 'bg-emerald-50 text-emerald-600';
    }

    if (status === 'ready' || status === 'washing' || status === 'drying') {
      return 'bg-amber-50 text-amber-600';
    }

    if (status === 'pending') {
      return 'bg-sky-50 text-sky-600';
    }

    return 'bg-indigo-50 text-indigo-600';
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'startDate' && next.startDate > next.endDate) {
        next.endDate = value;
      }

      if (name === 'endDate' && next.endDate < next.startDate) {
        next.startDate = value;
      }

      return next;
    });
  };

  const dateRangeLabel = `${new Date(`${dateRange.startDate}T00:00:00`).toLocaleDateString('en-GB')} - ${new Date(`${dateRange.endDate}T00:00:00`).toLocaleDateString('en-GB')}`;

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Reporting Center</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Order statistics</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review live laundry operations, order flow, garment volume, and staff workload using your system data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExportBundle}
              className="rounded-2xl border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3a2fd0] focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3a2fd0] focus:outline-none"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleCreateReport}
              className="rounded-2xl bg-[#3a2fd0] px-5 py-3 hover:bg-[#2f26af]"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            {topStats.map((stat) => (
              <Card key={stat.label} className="rounded-[24px] border-slate-200 p-0 shadow-none">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        stat.negative ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${stat.accent}`}>{loading ? '...' : stat.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{dateRangeLabel}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search order number, customer, order type, status, or staff..."
                className="w-[320px] max-w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Card className="rounded-[24px] border-slate-200 p-0 shadow-none">
              <CardContent className="p-5">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-3xl font-semibold text-slate-900">Order Statistics</h2>
                  <div className="flex items-center gap-5 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                      Orders
                    </span>
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                      Customers
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-[52px_1fr] gap-4">
                  <div className="flex h-[260px] flex-col justify-between text-xs text-slate-400">
                    {[1000, 800, 600, 400, 200, 0].map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>

                  <div className="relative h-[260px] border-b border-slate-100">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4].map((line) => (
                        <div key={line} className="border-t border-dashed border-slate-100" />
                      ))}
                    </div>

                    <div className="relative z-10 flex h-full items-end justify-between gap-4 px-2">
                      {lastSevenDays.map((day) => (
                        <div key={day.label} className="flex flex-1 flex-col items-center gap-3">
                          <div className="flex h-full items-end gap-2">
                            <div
                              className="w-4 rounded-full bg-sky-500 shadow-[0_10px_20px_rgba(59,130,246,0.22)]"
                              style={{ height: `${Math.max((day.orders / maxOrders) * 100, 8)}%` }}
                            />
                            <div
                              className="w-4 rounded-full bg-violet-500 shadow-[0_10px_20px_rgba(139,92,246,0.22)]"
                              style={{ height: `${Math.max((day.customers / maxCustomers) * 100, 8)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{day.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-slate-200 p-0 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold text-slate-900">Workflow overview</h2>
                    <div className="mt-3 flex items-center gap-3">
                      <p className="text-4xl font-bold text-emerald-600">
                        {filteredOrders.filter((order) => ['pending', 'washing', 'drying', 'ready'].includes(order.status)).length}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                        {getChangeText(
                          filteredOrders.filter((order) => ['pending', 'washing', 'drying', 'ready'].includes(order.status)).length,
                          previousPeriodOrders.filter((order) => ['pending', 'washing', 'drying', 'ready'].includes(order.status)).length
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Active orders still inside the laundry workflow for this report period</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">
                      {getChangeText(
                        filteredOrders.filter((order) => order.status === 'delivered').length,
                        previousPeriodOrders.filter((order) => order.status === 'delivered').length
                      )}
                    </span>
                    <span className="text-3xl font-bold text-sky-600">
                      {Math.round(
                        (filteredOrders.filter((order) => order.status === 'delivered').length /
                          Math.max(filteredOrders.length, 1)) *
                          100
                      )}%
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-[50px_1fr] gap-4">
                  <div className="flex h-[240px] flex-col justify-between text-xs text-slate-400">
                    {[20, 15, 10, 5, 0].map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>

                  <div className="relative h-[240px]">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4].map((line) => (
                        <div key={line} className="border-t border-dashed border-slate-100" />
                      ))}
                    </div>

                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
                      <polyline
                        fill="none"
                        stroke="#2f8ceb"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={activePoints}
                      />
                      <polyline
                        fill="none"
                        stroke="#4b8f36"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={deliveredPoints}
                      />
                    </svg>

                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-xs font-medium text-slate-500">
                      {workflowOverview.map((day) => (
                        <span key={day.label}>{day.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 rounded-[24px] border-slate-200 p-0 shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div>
                <h2 className="text-3xl font-semibold text-slate-900">Report orders</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Live orders in the selected date range with customer, staff, and workflow data from your system.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-600">Peak Order Time: {peakOrderTime}</span>
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-600">Top Order Day: {topOrderDay}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-600">
                    Customer Accounts: {customers.length}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-600">
                    Staff Accounts: {staffMembers.length}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Order</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Order Types</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Garments</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Staff</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(loading
                    ? [
                        {
                          id: 'loading-row',
                          orderNumber: 'Loading...',
                          customerName: '...',
                          orderTypes: '...',
                          garments: '...',
                          status: 'pending',
                          assignedStaffName: '...',
                          totalAmount: 0,
                        },
                      ]
                    : filteredReportOrders.length > 0
                      ? filteredReportOrders
                      : [
                          {
                            id: 'empty-row',
                            orderNumber: 'No orders found',
                            customerName: 'N/A',
                            orderTypes: 'N/A',
                            garments: 0,
                            status: 'pending',
                            assignedStaffName: 'N/A',
                            totalAmount: 0,
                          },
                        ]).map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-700">
                            {(row.customerName || 'NA').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{row.orderNumber}</p>
                            <p className="text-xs text-slate-500">
                              {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.customerName}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.orderTypes}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.garments}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusPillClass(row.status)}`}>
                          {String(row.status).replace(/^\w/, (match) => match.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.assignedStaffName}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">${Number(row.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
