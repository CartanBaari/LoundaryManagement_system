import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolvePaymentStatus = ({ amountPaid, remainingBalance }) => {
  if (amountPaid <= 0) {
    return 'unpaid';
  }

  if (remainingBalance <= 0) {
    return 'paid';
  }

  return 'partial';
};

export const getPayments = asyncHandler(async (req, res) => {
  const { status, paymentMethod, orderId, clientId, search, sortBy = '-createdAt' } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  if (orderId) {
    filter.orderId = orderId;
  }

  if (clientId) {
    filter.clientId = clientId;
  }

  if (search) {
    filter.$or = [
      { paymentId: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const payments = await Payment.find(filter)
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount paymentStatus userId userModel',
      populate: {
        path: 'userId',
        select: 'name phone email',
      },
    })
    .populate('clientId', 'name phone email')
    .sort(sortBy);

  res.status(200).json({
    success: true,
    count: payments.length,
    payments,
  });
});

export const createPayment = asyncHandler(async (req, res) => {
  const {
    orderId,
    clientId,
    customerName,
    phoneNumber,
    totalAmount,
    amountPaid,
    discount,
    paymentMethod,
    paymentDate,
    dueDate,
    status,
    notes,
  } = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Please select an order',
    });
  }

  const order = await Order.findById(orderId).populate('userId', 'name phone');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  if (order.userModel !== 'Client') {
    return res.status(400).json({
      success: false,
      message: 'Payments can only be recorded for client orders',
    });
  }

  const resolvedClientId = clientId || order.userId?._id?.toString();

  if (!resolvedClientId) {
    return res.status(400).json({
      success: false,
      message: 'Client information is missing for this order',
    });
  }

  if (clientId && order.userId?._id?.toString() !== clientId) {
    return res.status(400).json({
      success: false,
      message: 'Selected client does not match the selected order',
    });
  }

  const normalizedTotalAmount = Math.max(0, toSafeNumber(totalAmount, order.totalAmount || 0));
  const normalizedDiscount = Math.max(0, toSafeNumber(discount, 0));
  const normalizedPaidAmount = Math.max(0, toSafeNumber(amountPaid, 0));
  const normalizedRemaining = Math.max(0, normalizedTotalAmount - normalizedDiscount - normalizedPaidAmount);

  const normalizedStatus =
    ['paid', 'partial', 'unpaid'].includes(status)
      ? status
      : resolvePaymentStatus({
          amountPaid: normalizedPaidAmount,
          remainingBalance: normalizedRemaining,
        });

  const payment = await Payment.create({
    orderId: order._id,
    clientId: resolvedClientId,
    customerName: customerName || order.userId?.name || 'Unknown Customer',
    phoneNumber: phoneNumber || order.userId?.phone || '',
    totalAmount: normalizedTotalAmount,
    amountPaid: normalizedPaidAmount,
    remainingBalance: normalizedRemaining,
    discount: normalizedDiscount,
    paymentMethod: ['cash', 'mobile_money', 'bank'].includes(paymentMethod) ? paymentMethod : 'cash',
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : null,
    status: normalizedStatus,
    notes: notes || '',
  });

  order.paymentStatus = normalizedStatus === 'paid' ? 'paid' : 'pending';
  await order.save();

  const populatedPayment = await Payment.findById(payment._id)
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount paymentStatus userId userModel',
      populate: {
        path: 'userId',
        select: 'name phone email',
      },
    })
    .populate('clientId', 'name phone email');

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    payment: populatedPayment,
  });
});
