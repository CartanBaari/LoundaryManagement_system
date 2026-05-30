import { format } from 'date-fns';
import { Badge } from '../common/Badge';

const OrderCard = ({ order, onClick }) => {
  const getStatusColor = (status) => {
    const colors = {
      received: 'bg-blue-100 text-blue-800',
      washing: 'bg-purple-100 text-purple-800',
      drying: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getProgressPercentage = (status) => {
    const stages = {
      received: 20,
      washing: 40,
      drying: 60,
      ready: 80,
      delivered: 100,
    };
    return stages[status] || 0;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{order.orderNumber}</p>
          <p className="text-sm text-gray-500">{order.userId?.name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#10B981] h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage(order.status)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Items</p>
          <p className="font-semibold text-gray-900">{order.items?.length || 0} items</p>
        </div>
        <div>
          <p className="text-gray-500">Total</p>
          <p className="font-semibold text-gray-900">${order.totalAmount?.toFixed(2) || '0.00'}</p>
        </div>
        <div>
          <p className="text-gray-500">Pickup</p>
          <p className="font-semibold text-gray-900">
            {format(new Date(order.pickupDate), 'MMM dd')}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Delivery</p>
          <p className="font-semibold text-gray-900">
            {format(new Date(order.deliveryDate), 'MMM dd')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
