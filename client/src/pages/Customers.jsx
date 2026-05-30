import { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Search, PhoneCall, Mail, Wallet, MapPin, X, Download, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FeatureWorkspace from '../components/common/FeatureWorkspace';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { api, orderAPI, userAPI } from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        setLoading(true);

        const [customersResponse, ordersResponse] = await Promise.all([
          userAPI.getAll({ role: 'client' }),
          orderAPI.getAll(),
        ]);

        setCustomers(customersResponse.data?.users || []);
        setOrders(ordersResponse.data?.orders || []);
      } catch (error) {
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, []);

  const reloadCustomerData = async () => {
    try {
      setLoading(true);

      const [customersResponse, ordersResponse] = await Promise.all([
        userAPI.getAll({ role: 'client' }),
        orderAPI.getAll(),
      ]);

      setCustomers(customersResponse.data?.users || []);
      setOrders(ordersResponse.data?.orders || []);
    } catch (error) {
      toast.error('Failed to refresh customers');
    } finally {
      setLoading(false);
    }
  };

  const customerRows = useMemo(() => {
    const rows = customers.map((customer) => {
      const customerOrders = orders.filter((order) => order.userId?._id === customer._id);
      const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      const deliveredOrders = customerOrders.filter((order) => order.status === 'delivered').length;
      const location = customer.address?.trim() || 'No address provided';
      const tier =
        customerOrders.length >= 10 ? 'VIP' : customerOrders.length >= 4 ? 'Business' : 'Standard';

      return {
        id: customer._id,
        name: customer.name || 'Unnamed Customer',
        tier,
        status: customer.isActive !== false ? 'Active' : 'Inactive',
        orders: customerOrders.length,
        totalSpent,
        balance: `$${totalSpent.toFixed(2)}`,
        location,
        email: customer.email || 'N/A',
        phone: customer.phone || 'N/A',
        deliveredOrders,
      };
    });

    if (!searchTerm.trim()) {
      return rows;
    }

    const query = searchTerm.trim().toLowerCase();
    return rows.filter((customer) =>
      customer.name.toLowerCase().includes(query) ||
      customer.location.toLowerCase().includes(query) ||
      customer.tier.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query)
    );
  }, [customers, orders, searchTerm]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((customer) => customer.isActive !== false).length;
    const totalRevenue = customerRows.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0);

    return [
      {
        label: 'Total Customers',
        value: loading ? '...' : String(totalCustomers),
        badge: 'Live',
        icon: Users,
        tone: 'sky',
        helper: 'Registered client accounts in the system',
      },
      {
        label: 'Active Accounts',
        value: loading ? '...' : String(activeCustomers),
        badge: 'Healthy',
        icon: UserPlus,
        tone: 'emerald',
        helper: 'Customers with active accounts',
      },
      {
        label: 'Customer Revenue',
        value: loading ? '...' : `$${totalRevenue.toFixed(2)}`,
        badge: 'Orders',
        icon: Wallet,
        tone: 'amber',
        helper: 'Combined order value for customer accounts listed here',
      },
    ];
  }, [customerRows, customers, loading]);

  const customerInsights = useMemo(() => {
    const vipCustomers = customerRows.filter((customer) => customer.tier === 'VIP').length;
    const inactiveCustomers = customerRows.filter((customer) => customer.status === 'Inactive').length;
    const returningCustomers = customerRows.filter((customer) => customer.orders > 1).length;

    return [
      `${vipCustomers} VIP customer${vipCustomers === 1 ? '' : 's'} currently in the system`,
      `${returningCustomers} customer${returningCustomers === 1 ? '' : 's'} placed more than one order`,
      inactiveCustomers > 0
        ? `${inactiveCustomers} customer account${inactiveCustomers === 1 ? ' is' : 's are'} inactive`
        : 'All customer accounts are currently active',
    ];
  }, [customerRows]);

  const regionalSpread = useMemo(() => {
    const counts = customerRows.reduce((accumulator, customer) => {
      accumulator[customer.location] = (accumulator[customer.location] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [customerRows]);

  const handleCustomerInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerFormData((prev) => ({
      ...prev,
      [name]: name === 'email' ? value.trim().toLowerCase() : value,
    }));
  };

  const closeAddCustomerModal = () => {
    setShowAddCustomerModal(false);
    setEditingCustomer(null);
    setCustomerFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    if (!customerFormData.name || !customerFormData.email) {
      toast.error('Please fill in name and email');
      return;
    }

    setSavingCustomer(true);

    try {
      if (editingCustomer) {
        await userAPI.update(editingCustomer.id, {
          name: customerFormData.name,
          email: customerFormData.email,
          phone: customerFormData.phone,
          address: customerFormData.address,
        });
        toast.success('Customer updated successfully');
      } else {
        await api.post('/users', {
          ...customerFormData,
          role: 'client',
          password: 'temp_password_123',
        });
        toast.success('Customer created successfully');
      }

      closeAddCustomerModal();
      await reloadCustomerData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingCustomer ? 'update' : 'create'} customer`);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone === 'N/A' ? '' : customer.phone,
      address: customer.location === 'No address provided' ? '' : customer.location,
    });
    setShowAddCustomerModal(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await userAPI.delete(customerId);
      toast.success('Customer deleted successfully');
      await reloadCustomerData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleExportCustomers = () => {
    if (!customerRows.length) {
      toast.error('No customers available to export');
      return;
    }

    const header = ['Name', 'Email', 'Phone', 'Address', 'Tier', 'Status', 'Orders', 'Revenue'];
    const lines = customerRows.map((customer) => [
      customer.name,
      customer.email,
      customer.phone,
      customer.location,
      customer.tier,
      customer.status,
      customer.orders,
      customer.totalSpent.toFixed(2),
    ]);

    const csv = [header, ...lines]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Customers exported successfully');
  };

  return (
    <>
      <FeatureWorkspace
        eyebrow="Customer Hub"
        title="Customers"
        description="Track customer profiles, loyalty segments, service history, and account activity from one clean workspace."
        tone="sky"
        actions={[
          {
            label: 'Export Customers',
            icon: Download,
            onClick: handleExportCustomers,
            className: 'rounded-2xl border-0 bg-sky-100/80 px-5 py-3 text-slate-800 hover:bg-sky-100',
          },
          {
            label: 'Add Customer',
            icon: UserPlus,
            variant: 'primary',
            onClick: () => setShowAddCustomerModal(true),
            className: 'rounded-2xl bg-[#3a2fd0] px-6 py-3 hover:bg-[#2f26af]',
          },
        ]}
        stats={stats}
        filters={[
          {
            label: 'search',
            icon: Search,
            content: (
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customers, locations, or account tiers..."
                className="w-[320px] max-w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            ),
          },
        ]}
        tableTitle="Customer Directory"
        tableDescription={
          loading
            ? 'Loading customer relationships...'
            : `A focused view of ${customerRows.length} customer account${customerRows.length === 1 ? '' : 's'} and account health.`
        }
        columns={[
          {
            key: 'name',
            label: 'Customer',
            render: (value, row) => (
              <div>
                <p className="font-semibold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500">{row.location}</p>
              </div>
            ),
          },
          {
            key: 'tier',
            label: 'Tier',
            render: (value) => (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                {value}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (value) => (
              <span className={`inline-flex items-center gap-2 ${value === 'Active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${value === 'Active' ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                {value}
              </span>
            ),
          },
          { key: 'orders', label: 'Orders' },
          { key: 'balance', label: 'Balance' },
          {
            key: 'contact',
            label: 'Contact',
            render: (_, row) => (
              <div className="space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {row.email}
                </p>
                <p className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-slate-400" />
                  {row.phone}
                </p>
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditCustomer(row)}
                  className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(row.id)}
                  className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        rows={
          loading
            ? [
                {
                  id: 'loading',
                  name: 'Loading customers...',
                  location: 'Fetching live customer data',
                  tier: 'Standard',
                  status: 'Inactive',
                  orders: '...',
                  balance: '$0.00',
                  email: '...',
                  phone: '...',
                },
              ]
            : customerRows.length > 0
              ? customerRows
              : [
                  {
                    id: 'empty',
                    name: 'No customers found',
                    location: 'Create customer accounts to populate this page',
                    tier: 'Standard',
                    status: 'Inactive',
                    orders: 0,
                    balance: '$0.00',
                    email: 'N/A',
                    phone: 'N/A',
                  },
                ]
        }
        sidePanels={[
          {
            title: 'Customer Insights',
            description: 'Monitor retention signals and service behavior.',
            content: (
              <div className="space-y-4">
                {(loading ? ['Preparing customer insights...'] : customerInsights).map((item) => (
                  <div key={item} className="rounded-2xl bg-[#f6fbff] p-4 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            ),
          },
          {
            title: 'Regional Spread',
            description: 'Where your strongest customer clusters are located.',
            content: (
              <div className="space-y-4">
                {(loading ? [['Loading locations...', 0]] : regionalSpread.length ? regionalSpread : [['No addresses available', 0]]).map(([item, count]) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl bg-[#fafaff] p-4">
                    <div className="flex items-center gap-3 text-slate-700">
                      <MapPin className="h-5 w-5 text-sky-600" />
                      {item}
                    </div>
                    <span className="text-sm font-semibold text-slate-500">{count} customer{count === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[28px] border-sky-100 shadow-[0_30px_80px_rgba(58,47,208,0.18)]">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</CardTitle>
                  <CardDescription>
                    {editingCustomer
                      ? 'Update a customer account directly from this page.'
                      : 'Create a customer account directly from this page.'}
                  </CardDescription>
                </div>
                <button
                  onClick={closeAddCustomerModal}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateCustomer} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={customerFormData.name}
                    onChange={handleCustomerInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={customerFormData.email}
                    onChange={handleCustomerInputChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    required
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerFormData.phone}
                      onChange={handleCustomerInputChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={customerFormData.address}
                      onChange={handleCustomerInputChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-[#3a2fd0] focus:outline-none focus:ring-2 focus:ring-[#3a2fd0]/15"
                    />
                  </div>
                </div>

                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {editingCustomer
                    ? 'Update customer details here without affecting other accounts.'
                    : <>New customer accounts are created with a temporary password: <span className="font-semibold">temp_password_123</span></>}
                </p>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 rounded-2xl bg-[#3a2fd0] py-3 hover:bg-[#2f26af]"
                    disabled={savingCustomer}
                  >
                    {savingCustomer ? (editingCustomer ? 'Saving...' : 'Creating...') : (editingCustomer ? 'Update Customer' : 'Create Customer')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeAddCustomerModal}
                    className="flex-1 rounded-2xl py-3"
                  >
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

export default Customers;
