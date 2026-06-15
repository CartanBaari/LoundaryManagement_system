import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import Service from '../models/Service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createNotification,
  notifyUsersByRole,
} from '../utils/notificationService.js';
import { findUserByIdAndRole } from '../utils/userRoleService.js';
import { findClientById } from '../utils/accountService.js';
import { validateStaffAssignment, parseDateInput } from '../utils/staffWorkloadService.js';

// Create new order
export const createOrder = asyncHandler(async (req, res) => {
  const { items, pickupDate, deliveryDate, deliveryNotes, pickupAddress, deliveryAddress, userId, assignedStaff, paymentStatus, isUrgent } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide at least one item',
    });
  }

  const normalizedItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const submittedPrice = Number(item.price);
    const itemType = String(item.itemType || item.serviceName || '').trim();
    const serviceType = ['wash', 'iron', 'dryClean'].includes(item.serviceType) ? item.serviceType : 'wash';

    if (!itemType || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Each order item must include a valid item name and quantity',
      });
    }

    const normalizedItem = {
      itemType,
      quantity,
      price: Number.isFinite(submittedPrice) ? submittedPrice : 0,
      serviceType,
      serviceName: String(item.serviceName || itemType).trim(),
      category: String(item.category || '').trim(),
      serviceId: item.serviceId || null,
    };

    if (item.serviceId) {
      const service = await Service.findOne({ _id: item.serviceId, status: 'active' });

      if (!service) {
        return res.status(400).json({
          success: false,
          message: 'One of the selected services is no longer available',
        });
      }

      const resolvedPrice = Number(service[`${serviceType}Price`] || 0);

      if (resolvedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: `${service.name} does not have a valid ${serviceType} price`,
        });
      }

      normalizedItem.itemType = service.name;
      normalizedItem.serviceName = service.name;
      normalizedItem.category = service.category;
      normalizedItem.price = resolvedPrice;
      normalizedItem.serviceId = service._id;
    } else if (!Number.isFinite(submittedPrice) || submittedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Each order item must include a valid price',
      });
    }

    totalAmount += normalizedItem.price * normalizedItem.quantity;
    normalizedItems.push(normalizedItem);
  }

  if (isUrgent) {
    totalAmount *= 2;
  }

  if (!pickupAddress?.trim() || !deliveryAddress?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Please provide pickup and delivery addresses',
    });
  }

  // Check daily order limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const ordersToday = await Order.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow },
  });

  const settings = await Settings.findOne({ key: 'dailyOrderLimit' });
  const dailyLimit = settings ? settings.value : 20;

  let scheduledDate = parseDateInput(pickupDate);
  let message = 'Order created successfully';

  if (ordersToday >= dailyLimit) {
    // Schedule for next day
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    message = "Today's capacity is full. Your order is scheduled for tomorrow.";
  }

  let orderUserId = req.user._id;
  let orderUserModel = req.user.role === 'client' ? 'Client' : 'User';

  if (req.user.role === 'admin' && !userId) {
    return res.status(400).json({
      success: false,
      message: 'Please select a customer',
    });
  }

  if (req.user.role === 'admin' && userId) {
    const customer = await findClientById(userId, { isActive: true });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Selected customer was not found',
      });
    }

    orderUserId = customer._id;
    orderUserModel = 'Client';
  }

  let validatedAssignedStaff = null;

  if (assignedStaff) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can assign staff to orders',
      });
    }

    const staffMember = await findUserByIdAndRole(assignedStaff, 'staff', { isActive: true });

    if (!staffMember) {
      return res.status(400).json({
        success: false,
        message: 'Selected staff member was not found',
      });
    }

    validatedAssignedStaff = staffMember._id;

    const workloadCheck = await validateStaffAssignment(
      validatedAssignedStaff,
      scheduledDate
    );

    if (!workloadCheck.valid) {
      return res.status(400).json({
        success: false,
        message: workloadCheck.message,
        workload: workloadCheck,
      });
    }
  }

  let validatedPaymentStatus = 'pending';

  if (paymentStatus !== undefined) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can set payment status when creating orders',
      });
    }

    if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Payment status must be pending, paid, or failed',
      });
    }

    validatedPaymentStatus = paymentStatus;
  }

  // Create order
  let order = await Order.create({
    userId: orderUserId,
    userModel: orderUserModel,
    items: normalizedItems,
    pickupDate: scheduledDate,
    deliveryDate: new Date(deliveryDate),
    pickupAddress: pickupAddress.trim(),
    deliveryAddress: deliveryAddress.trim(),
    deliveryNotes,
    totalAmount,
    assignedStaff: validatedAssignedStaff,
    paymentStatus: validatedPaymentStatus,
  });

  order = await Order.findById(order._id)
    .populate('userId', 'name email phone')
    .populate('assignedStaff', 'name email phone');

  await createNotification({
    userId: order.userId._id,
    recipientModel: order.userModel,
    orderId: order._id,
    message: `Your order ${order.orderNumber} has been created successfully`,
    type: 'order_created',
  });

  await notifyUsersByRole({
    roles: ['admin'],
    orderId: order._id,
    message: `New order ${order.orderNumber} was created for ${order.userId.name}.`,
    type: 'new_order',
  });

  if (order.assignedStaff?._id) {
    await createNotification({
      userId: order.assignedStaff._id,
      recipientModel: 'User',
      orderId: order._id,
      message: `A new order ${order.orderNumber} has been assigned to you.`,
      type: 'assignment',
    });
  }

  res.status(201).json({
    success: true,
    message,
    order,
  });
});

// Get all orders (with filters)
export const getOrders = asyncHandler(async (req, res) => {
  const { status, assignedStaff, sortBy = '-createdAt' } = req.query;
  let filter = {};

  // Client can only see their own orders
  if (req.user.role === 'client') {
    filter.userId = req.user._id;
    filter.userModel = 'Client';
  }

  // Staff can see assigned orders
  if (req.user.role === 'staff') {
    filter.assignedStaff = req.user._id;
  }

  if (status) {
    filter.status = status;
  }

  if (assignedStaff) {
    filter.assignedStaff = assignedStaff;
  }

  const orders = await Order.find(filter)
    .populate('userId', 'name email phone')
    .populate('assignedStaff', 'name email phone')
    .sort(sortBy);

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// Get single order
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email phone address')
    .populate('assignedStaff', 'name email phone');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Check authorization
  if (req.user.role === 'client' && order.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this order',
    });
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// Update order
export const updateOrder = asyncHandler(async (req, res) => {
  const { status, assignedStaff, deliveryNotes, isDelivered, paymentStatus } = req.body;

  let order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Clients can only update their own orders and only delivery notes.
  if (req.user.role === 'client' && order.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this order',
    });
  }

  if (req.user.role === 'client' && (status || assignedStaff !== undefined || isDelivered !== undefined || paymentStatus !== undefined)) {
    return res.status(403).json({
      success: false,
      message: 'Clients can only update order notes',
    });
  }

  if (req.user.role === 'staff' && req.body.assignedStaff !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Staff cannot reassign orders',
    });
  }

  if (status && req.user.role === 'admin') {
    order.status = status;
  }

  if (status && req.user.role === 'staff') {
    if (!order.assignedStaff || order.assignedStaff.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Staff can only change the status of orders assigned to them',
      });
    }

    order.status = status;
  }

  const previousAssignedStaff = order.assignedStaff ? order.assignedStaff.toString() : null;

  if (assignedStaff !== undefined && req.user.role === 'admin') {
    if (!assignedStaff) {
      order.assignedStaff = null;
    } else {
      const nextStaffId = assignedStaff.toString();
      const currentStaffId = order.assignedStaff ? order.assignedStaff.toString() : null;

      if (nextStaffId !== currentStaffId) {
        const staffMember = await findUserByIdAndRole(assignedStaff, 'staff', { isActive: true });

        if (!staffMember) {
          return res.status(400).json({
            success: false,
            message: 'Selected staff member was not found',
          });
        }

        const workloadCheck = await validateStaffAssignment(
          staffMember._id,
          order.pickupDate,
          order._id
        );

        if (!workloadCheck.valid) {
          return res.status(400).json({
            success: false,
            message: workloadCheck.message,
            workload: workloadCheck,
          });
        }

        order.assignedStaff = staffMember._id;
      }
    }
  }

  if (deliveryNotes !== undefined) {
    order.deliveryNotes = deliveryNotes;
  }

  if (paymentStatus !== undefined && req.user.role === 'admin') {
    if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Payment status must be pending, paid, or failed',
      });
    }

    order.paymentStatus = paymentStatus;
  }

  if (isDelivered && req.user.role === 'admin') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.status = 'delivered';
  }

  order = await order.save();
  order = await Order.findById(order._id)
    .populate('userId', 'name email phone')
    .populate('assignedStaff', 'name email phone');

  if (status && (req.user.role === 'admin' || req.user.role === 'staff')) {
    await createNotification({
      userId: order.userId,
      recipientModel: order.userModel,
      orderId: order._id,
      message: `Your order status has been updated to ${status}`,
      type: 'status_update',
    });

    if (status === 'ready') {
      await notifyUsersByRole({
        roles: ['admin'],
        orderId: order._id,
        message: `Order ${order.orderNumber} is now ready for pickup or delivery.`,
        type: 'ready_order',
      });
    }
  }

  if (
    req.user.role === 'admin' &&
    order.assignedStaff &&
    order.assignedStaff.toString() !== previousAssignedStaff
  ) {
    await createNotification({
      userId: order.assignedStaff,
      recipientModel: 'User',
      orderId: order._id,
      message: `Order ${order.orderNumber} has been assigned to you.`,
      type: 'assignment',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order updated successfully',
    order,
  });
});

// Delete order
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order deleted successfully',
  });
});

// Get order statistics
export const getOrderStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = {
    totalOrders: await Order.countDocuments(),
    todayOrders: await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    }),
    pendingOrders: await Order.countDocuments({ status: { $ne: 'delivered' } }),
    completedOrders: await Order.countDocuments({ status: 'delivered' }),
    totalRevenue: 0,
  };

  // Calculate total revenue
  const revenueData = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  if (revenueData.length > 0) {
    stats.totalRevenue = revenueData[0].total;
  }

  res.status(200).json({
    success: true,
    stats,
  });
});
