import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Search, Banknote, Receipt, BadgeDollarSign, Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';
import FeatureWorkspace from '../components/common/FeatureWorkspace';
import { orderAPI, paymentAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';

const initialFormState = {
  clientId: '',
  orderId: '',
  customerName: '',
  phoneNumber: '',
  totalAmount: '',
  amountPaid: '',
  discount: '',
  paymentMethod: 'cash',
  paymentDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
};

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateValue) => {
  if (!dateValue) {
    return 'N/A';
  }

  return new Date(dateValue).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const methodLabelMap = {
  cash: 'Cash',
  mobile_money: 'Mobile Money (Hormuud / EVC Plus)',
  bank: 'Bank',
};

const statusStyleMap = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-rose-100 text-rose-700',
};

const statusLabelMap = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
};

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormState);
  const isAdmin = user?.role === 'admin';

  const loadPaymentsPageData = async () => {
    setLoading(true);

    try {
      const [paymentsResponse, ordersResponse, clientsResponse] = await Promise.all([
        paymentAPI.getAll(),
        orderAPI.getAll(),
        userAPI.getAll({ role: 'client' }),
      ]);

      setPayments(paymentsResponse.data?.payments || []);
      setOrders((ordersResponse.data?.orders || []).filter((order) => order.userModel === 'Client'));
      setClients(clientsResponse.data?.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    loadPaymentsPageData();
  }, [user]);

  const filteredOrders = useMemo(() => {
    if (!formData.clientId) {
      return orders;
    }

    return orders.filter((order) => order.userId?._id === formData.clientId);
  }, [orders, formData.clientId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === formData.orderId) || null,
    [orders, formData.orderId]
  );

  const computedRemaining = useMemo(() => {
    const totalAmount = Math.max(0, toSafeNumber(formData.totalAmount, selectedOrder?.totalAmount || 0));
    const amountPaid = Math.max(0, toSafeNumber(formData.amountPaid, 0));
    const discount = Math.max(0, toSafeNumber(formData.discount, 0));
    return Math.max(0, totalAmount - amountPaid - discount);
  }, [formData.totalAmount, formData.amountPaid, formData.discount, selectedOrder?.totalAmount]);

  const computedStatus = useMemo(() => {
    const amountPaid = Math.max(0, toSafeNumber(formData.amountPaid, 0));

    if (amountPaid <= 0) {
      return 'unpaid';
    }

    if (computedRemaining <= 0) {
      return 'paid';
    }

    return 'partial';
  }, [computedRemaining, formData.amountPaid]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) {
      return payments;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return payments.filter((payment) => {
      const orderNumber = payment.orderId?.orderNumber || '';
      const methodLabel = methodLabelMap[payment.paymentMethod] || payment.paymentMethod || '';

      return [payment.paymentId, payment.customerName, payment.phoneNumber, orderNumber, methodLabel]
        .join(' ')
        .toLowerCase()
        .includes(lowerSearch);
    });
  }, [payments, searchTerm]);

  const paymentRows = useMemo(
    () =>
      filteredPayments.map((payment) => ({
        id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId?.orderNumber || 'N/A',
        customer: payment.customerName || payment.clientId?.name || 'N/A',
        method: methodLabelMap[payment.paymentMethod] || payment.paymentMethod || 'N/A',
        amountPaid: formatCurrency(payment.amountPaid || 0),
        remainingBalance: formatCurrency(payment.remainingBalance || 0),
        status: payment.status || 'unpaid',
        paymentDate: formatDate(payment.paymentDate),
      })),
    [filteredPayments]
  );

  const todayCollected = useMemo(() => {
    const todayDateString = new Date().toDateString();
    return payments
      .filter((payment) => new Date(payment.paymentDate).toDateString() === todayDateString)
      .reduce((sum, payment) => sum + toSafeNumber(payment.amountPaid, 0), 0);
  }, [payments]);

  const totalOutstanding = useMemo(
    () => payments.reduce((sum, payment) => sum + toSafeNumber(payment.remainingBalance, 0), 0),
    [payments]
  );

  const successRate = useMemo(() => {
    if (!payments.length) {
      return 0;
    }

    const paidCount = payments.filter((payment) => payment.status === 'paid').length;
    return Math.round((paidCount / payments.length) * 100);
  }, [payments]);

  const settlementMix = useMemo(() => {
    const counts = payments.reduce(
      (acc, payment) => {
        const key = payment.paymentMethod || 'cash';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { cash: 0, mobile_money: 0, bank: 0 }
    );

    const totalCount = payments.length || 1;

    return [
      { key: 'mobile_money', label: 'Mobile Money', percentage: Math.round((counts.mobile_money / totalCount) * 100) },
      { key: 'cash', label: 'Cash', percentage: Math.round((counts.cash / totalCount) * 100) },
      { key: 'bank', label: 'Bank', percentage: Math.round((counts.bank / totalCount) * 100) },
    ];
  }, [payments]);

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      paymentDate: new Date().toISOString().split('T')[0],
    });
  };

  const closeModal = () => {
    setShowRecordModal(false);
    resetForm();
  };

  const openModal = () => {
    if (!isAdmin) {
      toast.error('Only admins can record payments');
      return;
    }

    setShowRecordModal(true);
    resetForm();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleClientSelect = (event) => {
    const selectedClientId = event.target.value;
    const selectedClient = clients.find((client) => client._id === selectedClientId);

    setFormData((previous) => ({
      ...previous,
      clientId: selectedClientId,
      orderId: '',
      customerName: selectedClient?.name || '',
      phoneNumber: selectedClient?.phone || '',
      totalAmount: '',
      amountPaid: '',
      discount: '',
      dueDate: '',
      notes: '',
    }));
  };

  const handleOrderSelect = (event) => {
    const selectedOrderId = event.target.value;
    const order = orders.find((entry) => entry._id === selectedOrderId);

    if (!order) {
      setFormData((previous) => ({
        ...previous,
        orderId: '',
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      orderId: selectedOrderId,
      clientId: order.userId?._id || previous.clientId,
      customerName: order.userId?.name || previous.customerName,
      phoneNumber: order.userId?.phone || previous.phoneNumber,
      totalAmount: String(toSafeNumber(order.totalAmount, 0)),
      amountPaid: previous.amountPaid || '',
      discount: previous.discount || '',
    }));
  };

  const handleSubmitPayment = async (event) => {
    event.preventDefault();

    if (!formData.orderId) {
      toast.error('Please select an order');
      return;
    }

    if (!formData.clientId) {
      toast.error('Please select a client');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        clientId: formData.clientId,
        orderId: formData.orderId,
        customerName: formData.customerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        totalAmount: Math.max(0, toSafeNumber(formData.totalAmount, selectedOrder?.totalAmount || 0)),
        amountPaid: Math.max(0, toSafeNumber(formData.amountPaid, 0)),
        discount: Math.max(0, toSafeNumber(formData.discount, 0)),
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate,
        dueDate: formData.dueDate || undefined,
        status: computedStatus,
        notes: formData.notes.trim(),
      };

      const response = await paymentAPI.create(payload);
      toast.success(`Payment recorded (${response.data?.payment?.paymentId || 'Saved'})`);
      closeModal();
      await loadPaymentsPageData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <FeatureWorkspace
        eyebrow="Revenue Desk"
        title="Payments"
        description="Review collections, invoice status, and settlement methods in a layout consistent with the rest of your dashboard."
        tone="amber"
        actions={[
          {
            label: 'Export Payments',
            icon: Receipt,
            onClick: () => toast.success('Payment export can be connected next'),
            className: 'rounded-2xl border-0 bg-amber-100/80 px-5 py-3 text-slate-800 hover:bg-amber-100',
          },
          isAdmin
            ? {
                label: 'Record Payment',
                icon: BadgeDollarSign,
                variant: 'primary',
                onClick: openModal,
                className: 'rounded-2xl bg-[#3a2fd0] px-6 py-3 hover:bg-[#2f26af]',
              }
            : null,
        ].filter(Boolean)}
        stats={[
          {
            label: 'Collected Today',
            value: formatCurrency(todayCollected),
            badge: 'Live',
            icon: Wallet,
            tone: 'amber',
            helper: 'Total collected in today’s payments',
          },
          {
            label: 'Outstanding',
            value: formatCurrency(totalOutstanding),
            badge: totalOutstanding > 0 ? 'Attention' : 'Clear',
            icon: CreditCard,
            tone: 'rose',
            helper: 'Remaining balances from recorded payments',
          },
          {
            label: 'Payment Success',
            value: `${successRate}%`,
            badge: payments.length ? 'Live' : 'No Data',
            icon: Banknote,
            tone: 'emerald',
            helper: 'Share of fully paid transactions',
          },
        ]}
        filters={[
          {
            label: 'search',
            icon: Search,
            content: (
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search payment ID, order ID, method, or customer..."
                className="w-full min-w-[240px] bg-transparent text-sm text-slate-600 focus:outline-none"
              />
            ),
          },
        ]}
        tableTitle="Payment Activity"
        tableDescription={
          loading ? 'Loading payments...' : `Monitor payment status and revenue collection performance. (${paymentRows.length} records)`
        }
        columns={[
          { key: 'paymentId', label: 'Payment ID' },
          { key: 'orderId', label: 'Order ID' },
          { key: 'customer', label: 'Customer' },
          { key: 'method', label: 'Method' },
          { key: 'amountPaid', label: 'Amount Paid' },
          { key: 'remainingBalance', label: 'Remaining' },
          { key: 'paymentDate', label: 'Payment Date' },
          {
            key: 'status',
            label: 'Status',
            render: (value) => (
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyleMap[value] || statusStyleMap.unpaid}`}>
                {statusLabelMap[value] || value}
              </span>
            ),
          },
        ]}
        rows={paymentRows}
        sidePanels={[
          {
            title: 'Collection Alerts',
            description: 'Important payment signals from current records.',
            content: (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#fffaf1] p-4 text-slate-700">
                  {paymentRows.filter((row) => row.status !== 'paid').length} payments are still partial or unpaid.
                </div>
                <div className="rounded-2xl bg-[#fffaf1] p-4 text-slate-700">
                  Outstanding balance currently stands at {formatCurrency(totalOutstanding)}.
                </div>
                <div className="rounded-2xl bg-[#fffaf1] p-4 text-slate-700">
                  Total recorded payments: {payments.length}.
                </div>
              </div>
            ),
          },
          {
            title: 'Settlement Mix',
            description: 'Payment method distribution.',
            content: (
              <div className="space-y-4">
                {settlementMix.map((item) => (
                  <div key={item.key} className="rounded-2xl bg-[#fafaff] p-4 text-slate-700">
                    {item.label} {item.percentage}%
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[95vh] w-full max-w-4xl overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Record Payment</CardTitle>
                  <CardDescription>
                    Create a payment record with client details, order reference, and settlement status.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPayment} className="space-y-6">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Payment ID</label>
                      <input
                        value="Auto-generated on save"
                        readOnly
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Client</label>
                      <select
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleClientSelect}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        required
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client._id} value={client._id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Order ID</label>
                      <select
                        name="orderId"
                        value={formData.orderId}
                        onChange={handleOrderSelect}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        required
                      >
                        <option value="">Select order</option>
                        {filteredOrders.map((order) => (
                          <option key={order._id} value={order._id}>
                            {order.orderNumber} ({formatCurrency(order.totalAmount || 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Customer Name</label>
                      <input
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        placeholder="Customer full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        placeholder="Customer phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Payment Details</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Total Amount</label>
                      <input
                        name="totalAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.totalAmount}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Amount Paid</label>
                      <input
                        name="amountPaid"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amountPaid}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Discount</label>
                      <input
                        name="discount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discount}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Remaining Balance</label>
                      <input
                        type="number"
                        value={computedRemaining.toFixed(2)}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Method</label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="mobile_money">Mobile Money (Hormuud / EVC Plus)</option>
                        <option value="bank">Bank</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Dates</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Payment Date</label>
                      <input
                        name="paymentDate"
                        type="date"
                        value={formData.paymentDate}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Due Date (if debt)</label>
                      <input
                        name="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Extra</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                      <input
                        value={statusLabelMap[computedStatus]}
                        readOnly
                        className={`w-full rounded-lg border px-4 py-2 ${statusStyleMap[computedStatus]}`}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        placeholder="Optional details..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 md:flex-row">
                  <Button type="submit" variant="primary" className="md:flex-1" disabled={submitting}>
                    {submitting ? 'Recording...' : 'Record Payment'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal} className="md:flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Payments;
