import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  Info,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';

const fallbackNotifications = [
  {
    _id: 'demo-ready-1',
    type: 'ready_order',
    message: 'Order ORD-20260404-11802-8232 is now ready for pickup or delivery.',
    createdAt: new Date().toISOString(),
    isRead: false,
    orderId: { orderNumber: 'ORD-20260404-11802-8232', status: 'ready' },
  },
  {
    _id: 'demo-new-1',
    type: 'new_order',
    message: 'New order ORD-20260401-140956-7972 was created for Baari Shire Maxamed.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: false,
    orderId: { orderNumber: 'ORD-20260401-140956-7972', status: 'pending' },
  },
  {
    _id: 'demo-assignment-1',
    type: 'assignment',
    message: 'A new order ORD-20260404-11802-8232 has been assigned to you.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isRead: true,
    orderId: { orderNumber: 'ORD-20260404-11802-8232', status: 'pending' },
  },
];

const statusClasses = {
  ready: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  washing: 'bg-sky-100 text-sky-700',
  drying: 'bg-violet-100 text-violet-700',
  delivered: 'bg-slate-100 text-slate-700',
};

const getNotificationMeta = (notification) => {
  const createdAt = notification.createdAt ? new Date(notification.createdAt) : new Date();
  const orderNumber = notification.orderId?.orderNumber || notification.message.match(/ORD-[\d-]+/)?.[0] || 'Order';
  const status = notification.orderId?.status || (notification.type === 'ready_order' ? 'ready' : 'pending');
  const customerName = notification.orderId?.userId?.name || 'Unknown customer';
  const customerEmail = notification.orderId?.userId?.email || 'No email available';

  return {
    ...notification,
    createdAt,
    orderNumber,
    status,
    customerName,
    customerEmail,
    timeAgo: formatDistanceToNow(createdAt, { addSuffix: true }),
  };
};

function AdminTable({ title, description, rows, emptyLabel, onMarkAsRead, onDelete, actionSlot, showCustomerColumns = false }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        {actionSlot}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#f8fbff]">
            <tr>
              {[
                'Order',
                ...(showCustomerColumns ? ['Customer Name', 'Customer Email'] : []),
                'Notification',
                'Status',
                'Received',
                'Actions',
              ].map((label) => (
                <th key={label} className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row._id} className="border-t border-slate-100 transition hover:bg-[#fafcff]">
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-900">{row.orderNumber}</p>
                  </td>
                  {showCustomerColumns && (
                    <td className="px-6 py-5">
                      <p className="font-medium text-slate-900">{row.customerName}</p>
                    </td>
                  )}
                  {showCustomerColumns && (
                    <td className="px-6 py-5">
                      <p className="text-sm text-slate-600">{row.customerEmail}</p>
                    </td>
                  )}
                  <td className="px-6 py-5">
                    <p className="max-w-2xl text-sm leading-7 text-slate-700">{row.message}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses[row.status] || statusClasses.pending}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-500">{row.timeAgo}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {!row.isRead && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(row)}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f4aa3] transition hover:bg-blue-50"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showCustomerColumns ? 7 : 5} className="px-6 py-16 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#0f4aa3]">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-slate-900">{emptyLabel}</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotificationList({ rows, onMarkAsRead, onDelete }) {
  return (
    <div className="space-y-4">
      {rows.length ? (
        rows.map((row) => (
          <article key={row._id} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-slate-900">{row.orderNumber}</h3>
                  {!row.isRead && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                </div>
                <p className="mt-3 text-base leading-8 text-slate-700">{row.message}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses[row.status] || statusClasses.pending}`}>
                  {row.status}
                </span>
                <span className="text-sm text-slate-500">{row.timeAgo}</span>
                {!row.isRead && (
                  <button
                    type="button"
                    onClick={() => onMarkAsRead(row)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0f4aa3] transition hover:bg-blue-50"
                  >
                    Mark as read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/80 px-8 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#0f4aa3]">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-slate-900">No notifications to display</h2>
        </div>
      )}
    </div>
  );
}

const Notifications = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeAdminTab, setActiveAdminTab] = useState('ready');
  const [searchTerm, setSearchTerm] = useState('');
  const [demoNotifications, setDemoNotifications] = useState(fallbackNotifications);
  const [checkingEmailStatus, setCheckingEmailStatus] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendBroadcast,
    emailStatus,
    fetchEmailStatus,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications(60);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    setCheckingEmailStatus(true);
    fetchEmailStatus().finally(() => setCheckingEmailStatus(false));
  }, [fetchEmailStatus, isAdmin]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const usingFallback = Boolean(error);

  const activityFeed = useMemo(() => {
    const source = usingFallback ? demoNotifications : notifications;
    return source.map(getNotificationMeta).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }, [notifications, demoNotifications, usingFallback]);

  const query = searchTerm.trim().toLowerCase();
  const readyOrderNotifications = useMemo(
    () =>
      activityFeed.filter((item) => {
        const matchesType = item.type === 'ready_order' || item.status === 'ready';
        const matchesQuery =
          !query || `${item.orderNumber} ${item.message} ${item.status}`.toLowerCase().includes(query);
        return matchesType && matchesQuery;
      }),
    [activityFeed, query]
  );

  const recentOrderNotifications = useMemo(
    () =>
      activityFeed.filter((item) => {
        const matchesType = item.type === 'new_order' || item.type === 'order_created';
        const matchesQuery =
          !query || `${item.orderNumber} ${item.message} ${item.status}`.toLowerCase().includes(query);
        return matchesType && matchesQuery;
      }),
    [activityFeed, query]
  );

  const otherNotifications = useMemo(
    () =>
      activityFeed.filter((item) => {
        const isOrderNotification = Boolean(item.orderId) || ['order_created', 'status_update', 'assignment', 'ready_order'].includes(item.type);
        const matchesQuery =
          !query || `${item.orderNumber} ${item.message} ${item.status}`.toLowerCase().includes(query);
        return isOrderNotification && matchesQuery;
      }),
    [activityFeed, query]
  );

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) {
      return;
    }

    if (usingFallback) {
      setDemoNotifications((current) =>
        current.map((entry) => (entry._id === notification._id ? { ...entry, isRead: true } : entry))
      );
      toast.success('Demo notification marked as read.');
      return;
    }

    await markAsRead(notification._id);
    toast.success('Notification marked as read.');
  };

  const handleDelete = async (notification) => {
    if (usingFallback) {
      setDemoNotifications((current) => current.filter((entry) => entry._id !== notification._id));
      toast.success('Demo notification removed.');
      return;
    }

    await deleteNotification(notification._id);
    toast.success('Notification deleted.');
  };

  const handleMarkAll = async () => {
    if (usingFallback) {
      setDemoNotifications((current) => current.map((entry) => ({ ...entry, isRead: true })));
      toast.success('Demo notifications marked as read.');
      return;
    }

    await markAllAsRead();
    toast.success('All notifications marked as read.');
  };

  const handleSendAllReadyMessage = async () => {
    if (!readyOrderNotifications.length) {
      toast.error('There are no ready-order notifications to send.');
      return;
    }

    if (isAdmin && !emailReady) {
      toast.error(emailStatus.message || 'Email service is not configured correctly yet.');
      return;
    }

    const readyOrderList = readyOrderNotifications
      .slice(0, 10)
      .map((item) => item.orderNumber)
      .join(', ');

    try {
      const response = await sendBroadcast({
        message: `Ready order update: the following orders are ready for pickup or delivery - ${readyOrderList}.`,
      });
      toast.success(response.message);
    } catch (sendError) {
      toast.error(sendError.response?.data?.message || 'Failed to send the ready-order message.');
    }
  };

  const adminTabs = [
    { label: 'Ready Orders', value: 'ready', count: readyOrderNotifications.length },
    { label: 'Recent Orders', value: 'recent', count: recentOrderNotifications.length },
  ];

  const emailReady = !isAdmin || emailStatus.configured;

  return (
    <div className="min-h-full rounded-[34px] bg-gradient-to-br from-[#f5f8fd] via-white to-[#eef4fb] p-4 md:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0f4aa3] shadow-sm">
                Notifications
              </span>
              <span className="rounded-full bg-[#e7effd] px-4 py-2 text-sm font-semibold text-slate-600">
                {loading ? 'Syncing...' : `${usingFallback ? activityFeed.filter((item) => !item.isRead).length : unreadCount} unread`}
              </span>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
                {isAdmin ? 'Notification Center' : 'Activity Stream'}
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-slate-600 md:text-2xl">
                {isAdmin
                  ? 'Track ready-order alerts and recently created orders from two focused tabs.'
                  : 'Keep track of every flow in your laundry operations.'}
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-4 xl:items-end">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-[22px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={isAdmin ? 'Search order notifications...' : 'Search activities...'}
                  className="w-full border-0 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                onClick={handleMarkAll}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-3 rounded-[26px] bg-[#eef2f8] p-2 shadow-inner">
                {adminTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveAdminTab(tab.value)}
                    className={`rounded-[18px] px-5 py-3 text-base font-semibold transition ${
                      activeAdminTab === tab.value
                        ? 'bg-white text-[#0f4aa3] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-10">
          {isAdmin ? (
            activeAdminTab === 'ready' ? (
              <div className="space-y-4">
                {!emailReady && (
                  <div className="flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
                    <Info className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Customer email is not ready yet.</p>
                      <p className="mt-1 text-sm">
                        {checkingEmailStatus ? 'Checking email configuration...' : emailStatus.message}
                      </p>
                    </div>
                  </div>
                )}
                <AdminTable
                  title="Ready Order Notifications"
                  description="All new notifications for orders that are ready for pickup or delivery."
                  rows={readyOrderNotifications}
                  emptyLabel="No ready-order notifications found"
                  showCustomerColumns
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  actionSlot={(
                    <button
                      type="button"
                      onClick={handleSendAllReadyMessage}
                      disabled={!emailReady || checkingEmailStatus}
                      title={!emailReady ? emailStatus.message : 'Send ready-order email update to all customers'}
                      className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
                        emailReady && !checkingEmailStatus
                          ? 'bg-[#0f4aa3] hover:bg-[#0b3a7f]'
                          : 'cursor-not-allowed bg-slate-300'
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      {checkingEmailStatus ? 'Checking Email Setup...' : 'Send All Message'}
                    </button>
                  )}
                />
              </div>
            ) : (
              <AdminTable
                title="Recently Created Orders"
                description="See all recent order-creation notifications in one place."
                rows={recentOrderNotifications}
                emptyLabel="No recent order notifications found"
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                actionSlot={(
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                    Showing latest created-order activity
                  </div>
                )}
              />
            )
          ) : (
            <NotificationList rows={otherNotifications} onMarkAsRead={handleMarkAsRead} onDelete={handleDelete} />
          )}
        </div>

        <section className="mt-10 rounded-[36px] border border-dashed border-[#d7e3f4] bg-white/60 px-8 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#0f4aa3]">
            {isAdmin ? <MessageSquare className="h-8 w-8" /> : <Bell className="h-8 w-8" />}
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-slate-300">
            {isAdmin ? 'Message actions stay here' : 'That\'s all for now'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            {isAdmin
              ? emailReady
                ? 'Send-all emails every active customer in real time through the configured SMTP service.'
                : 'Add a valid email password in the server settings, then restart the backend to enable send-all.'
              : 'Your operations are flowing smoothly. Check back later for new activities.'}
          </p>
        </section>
      </div>
    </div>
  );
};

export default Notifications;
