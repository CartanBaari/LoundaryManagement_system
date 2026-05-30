import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useOrders';
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import OrderCard from '../components/dashboard/OrderCard';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const { orders, fetchOrders, fetchOrderById, loading } = useOrders();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch orders based on role
        const params = {};
        if (user?.role === 'staff') {
          params.assignedStaff = user._id;
        }
        await fetchOrders(params);

        // Calculate stats
        const pending = orders.filter((o) => o.status !== 'delivered').length;
        const completed = orders.filter((o) => o.status === 'delivered').length;
        const revenue = orders
          .filter((o) => o.status === 'delivered')
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        setStats({
          totalOrders: orders.length,
          pendingOrders: pending,
          completedOrders: completed,
          totalRevenue: revenue,
        });
      } catch (error) {
        toast.error('Failed to load dashboard data');
      }
    };

    if (user) {
      loadData();
    }
  }, [user, fetchOrders, orders.length]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">Welcome to your LaundryHub dashboard</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.totalOrders}
          color="bg-[#38BDF8]"
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={stats.pendingOrders}
          color="bg-orange-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Orders"
          value={stats.completedOrders}
          color="bg-[#10B981]"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="bg-purple-500"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.slice(0, 6).map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedOrder.orderNumber}
                </h3>
                <p className="text-sm text-gray-500">{selectedOrder.userId?.name}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {selectedOrder.status}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Items</p>
                  <p className="font-semibold text-gray-900">
                    {selectedOrder.items?.length || 0}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="font-semibold text-gray-900">
                    ${selectedOrder.totalAmount?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Items</p>
                <ul className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      <span>{item.serviceName || item.itemType}</span>
                      {item.serviceType ? ` (${item.serviceType})` : ''} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2 bg-[#38BDF8] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
