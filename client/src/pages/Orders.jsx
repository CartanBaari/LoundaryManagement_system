import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { useNotifications } from '../hooks/useNotifications';
import NewOrder from './NewOrder';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/common/Table';
import { Button } from '../components/common/Button';
import Badge from '../components/common/Badge';
import { Plus, Search, Filter, Eye, Edit2, Trash2, UserCheck, X, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';

const Orders = () => {
  const { user } = useAuth();
  const { orders, fetchOrders, updateOrder, deleteOrder, loading } = useOrders();
  const { sendBroadcast, sendDirect } = useNotifications();
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editFormData, setEditFormData] = useState({
    status: 'pending',
    deliveryNotes: '',
  });
  const [messageModal, setMessageModal] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [assignStaffId, setAssignStaffId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const params = {};
        if (user?.role === 'client') {
          params.userId = user._id;
        }
        await fetchOrders(params);
      } catch (error) {
        toast.error('Failed to load orders');
      }
    };

    if (user) {
      loadOrders();
    }
  }, [user, fetchOrders]);

  useEffect(() => {
    const loadStaffMembers = async () => {
      if (!isAdmin) {
        setStaffMembers([]);
        setCustomers([]);
        return;
      }

      try {
        const [staffResponse, customersResponse] = await Promise.all([
          userAPI.getStaff(),
          userAPI.getAll({ role: 'client' }),
        ]);
        setStaffMembers(staffResponse.data?.staffMembers || []);
        setCustomers(customersResponse.data?.users || []);
      } catch (error) {
        toast.error('Failed to load messaging and staff data');
      }
    };

    loadStaffMembers();
  }, [isAdmin]);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'yellow',
      washing: 'blue',
      drying: 'purple',
      ready: 'green',
      delivered: 'green',
      cancelled: 'red',
    };
    return statusColors[status] || 'gray';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatItemTypes = (items = []) => {
    if (!items.length) {
      return 'N/A';
    }

    const uniqueTypes = [
      ...new Set(items.map((item) => item.serviceName || item.itemType || 'Other').filter(Boolean)),
    ];
    return uniqueTypes.join(', ');
  };

  const canEditOrders = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'client';
  const canDeleteOrders = user?.role === 'admin';
  const canManageStatus = user?.role === 'admin' || user?.role === 'staff';

  const openViewModal = (order) => {
    setSelectedOrder(order);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditFormData({
      status: order.status || 'pending',
      deliveryNotes: order.deliveryNotes || '',
    });
  };

  const openAssignModal = (order) => {
    setAssigningOrder(order);
    setAssignStaffId(order.assignedStaff?._id || '');
  };

  const closeModals = () => {
    setSelectedOrder(null);
    setEditingOrder(null);
    setAssigningOrder(null);
    setMessageModal(null);
    setMessageText('');
    setSelectedCustomerId('');
    setEditFormData({
      status: 'pending',
      deliveryNotes: '',
    });
    setAssignStaffId('');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();

    if (!editingOrder) {
      return;
    }

    setSubmitting(true);

    try {
      const payload =
        user?.role !== 'admin'
          ? { deliveryNotes: editFormData.deliveryNotes }
          : {
              status: editFormData.status,
              deliveryNotes: editFormData.deliveryNotes,
            };

      await updateOrder(editingOrder._id, payload);
      toast.success('Order updated successfully');
      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      await deleteOrder(orderId);
      toast.success('Order deleted successfully');
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete order');
    }
  };

  const handleAssignOrder = async (e) => {
    e.preventDefault();

    if (!assigningOrder) {
      return;
    }

    setSubmitting(true);

    try {
      await updateOrder(assigningOrder._id, {
        assignedStaff: assignStaffId || null,
      });
      toast.success('Staff assigned successfully');
      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign staff');
    } finally {
      setSubmitting(false);
    }
  };

  const openMessageModal = (mode, order = null) => {
    setMessageModal({ mode, order });
    setMessageText('');
    setSelectedCustomerId(order?.userId?._id || '');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim()) {
      toast.error('Enter a message first');
      return;
    }

    setSubmitting(true);

    try {
      if (messageModal?.mode === 'all') {
        const response = await sendBroadcast({ message: messageText.trim() });
        toast.success(response.message);
      } else {
        const targetUserId = messageModal?.mode === 'single' ? messageModal?.order?.userId?._id : selectedCustomerId;

        if (!targetUserId) {
          toast.error('Select a customer first');
          setSubmitting(false);
          return;
        }

        const response = await sendDirect({
          userId: targetUserId,
          message: messageText.trim(),
        });
        toast.success(response.message);
      }

      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track all orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => openMessageModal('all')} className="flex items-center gap-2">
                <Send size={18} />
                Message All Customers
              </Button>
              <Button variant="outline" onClick={() => openMessageModal('customer')} className="flex items-center gap-2">
                <MessageSquare size={18} />
                Message One Customer
              </Button>
            </>
          )}
          {(user?.role === 'admin' || user?.role === 'client') && (
            <Button
              variant="primary"
              onClick={() => setShowCreateOrderModal(true)}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by order ID or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="washing">Washing</option>
                <option value="drying">Drying</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>{filteredOrders.length} orders found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableHeader>Order ID</TableHeader>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader>Order Type</TableHeader>
                  <TableHeader>Status</TableHeader>
                  {isAdmin && <TableHeader>Assigned Staff</TableHeader>}
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-semibold text-gray-900">{order.orderNumber}</TableCell>
                    <TableCell>{order.userId?.name || 'N/A'}</TableCell>
                    <TableCell className="whitespace-normal min-w-[180px]">
                      {formatItemTypes(order.items)}
                    </TableCell>
                    <TableCell>
                      <Badge color={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>{order.assignedStaff?.name || 'Unassigned'}</TableCell>
                    )}
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${order.totalAmount?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(order)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {canEditOrders && (
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => openMessageModal('single', order)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Send message to customer"
                          >
                            <MessageSquare size={18} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Assign staff"
                          >
                            <UserCheck size={18} />
                          </button>
                        )}
                        {canDeleteOrders && (
                          <button
                            onClick={() => handleDeleteOrder(order._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{selectedOrder.orderNumber}</CardTitle>
                  <CardDescription>
                    {selectedOrder.userId?.name || 'N/A'} • {formatDate(selectedOrder.createdAt)}
                  </CardDescription>
                </div>
                <button
                  onClick={closeModals}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Order Type</p>
                    <p className="font-semibold text-gray-900">{formatItemTypes(selectedOrder.items)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="font-semibold text-gray-900">
                      ${selectedOrder.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge color={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Badge>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Delivery Notes</p>
                  <p className="text-gray-900">{selectedOrder.deliveryNotes || 'No notes added'}</p>
                </div>
                {isAdmin && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Assigned Staff</p>
                    <p className="text-gray-900">{selectedOrder.assignedStaff?.name || 'Unassigned'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Update Order</CardTitle>
                  <CardDescription>{editingOrder.orderNumber}</CardDescription>
                </div>
                <button
                  onClick={closeModals}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOrder} className="space-y-4">
                {canManageStatus && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="washing">Washing</option>
                      <option value="drying">Drying</option>
                      <option value="ready">Ready</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Notes
                  </label>
                  <textarea
                    name="deliveryNotes"
                    value={editFormData.deliveryNotes}
                    onChange={handleEditInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                    placeholder="Add delivery notes"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
                    {submitting ? 'Saving...' : 'Update Order'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModals} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {assigningOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Assign Staff</CardTitle>
                  <CardDescription>{assigningOrder.orderNumber}</CardDescription>
                </div>
                <button
                  onClick={closeModals}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Member
                  </label>
                  <select
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="">Unassigned</option>
                    {staffMembers.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
                    {submitting ? 'Saving...' : 'Assign Staff'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModals} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {messageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {messageModal.mode === 'all' ? 'Message All Customers' : 'Send Customer Message'}
                  </CardTitle>
                  <CardDescription>
                    {messageModal.mode === 'single'
                      ? messageModal.order?.userId?.name
                      : messageModal.mode === 'customer'
                        ? 'Choose a customer and send an in-app message'
                        : 'Broadcast an in-app message to all customers'}
                  </CardDescription>
                </div>
                <button
                  onClick={closeModals}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                {messageModal.mode === 'customer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                    placeholder="Type your message to customers..."
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Messages are delivered as in-app notifications. External email/SMS delivery is not configured yet.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
                    {submitting ? 'Sending...' : 'Send Message'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModals} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateOrderModal && (
        <NewOrder
          isModal
          onCancel={() => setShowCreateOrderModal(false)}
          onSuccess={async () => {
            setShowCreateOrderModal(false);
            await fetchOrders(user?.role === 'client' ? { userId: user._id } : {});
          }}
        />
      )}
    </div>
  );
};

export default Orders;
