import Payment from '../models/Payment.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  deletePaymentRecord,
  getInvoices,
  getOutstandingPaymentOptions,
  getPaymentOverviewStats,
  getPaymentReportSummary,
  recordPayment,
  updatePaymentRecord,
} from '../utils/paymentService.js';

export const getPayments = asyncHandler(async (req, res) => {
  const { status, paymentMethod, orderId, clientId, search, sortBy = '-createdAt', startDate, endDate } =
    req.query;
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
      { transactionNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { referenceNumber: { $regex: search, $options: 'i' } },
    ];
  }

  if (startDate || endDate) {
    filter.paymentDate = {};
    if (startDate) {
      filter.paymentDate.$gte = new Date(`${startDate}T00:00:00.000`);
    }
    if (endDate) {
      filter.paymentDate.$lte = new Date(`${endDate}T23:59:59.999`);
    }
  }

  const payments = await Payment.find(filter)
    .populate('invoiceId', 'invoiceNumber paidAmount remainingAmount status totalAmount discount')
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount paymentStatus status userId userModel',
      populate: {
        path: 'userId',
        select: 'name phone email',
      },
    })
    .populate('clientId', 'name phone email outstandingBalance')
    .sort(sortBy);

  res.status(200).json({
    success: true,
    count: payments.length,
    payments,
  });
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('invoiceId', 'invoiceNumber paidAmount remainingAmount status totalAmount discount')
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount paymentStatus status userId userModel',
      populate: {
        path: 'userId',
        select: 'name phone email',
      },
    })
    .populate('clientId', 'name phone email outstandingBalance');

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found',
    });
  }

  res.status(200).json({
    success: true,
    payment,
  });
});

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await recordPayment(req.body);

  const populatedPayment = await Payment.findById(payment._id)
    .populate('invoiceId', 'invoiceNumber paidAmount remainingAmount status totalAmount discount')
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount paymentStatus status userId userModel',
      populate: {
        path: 'userId',
        select: 'name phone email',
      },
    })
    .populate('clientId', 'name phone email outstandingBalance');

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    payment: populatedPayment,
  });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await updatePaymentRecord(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Payment updated successfully',
    payment,
  });
});

export const deletePayment = asyncHandler(async (req, res) => {
  await deletePaymentRecord(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Payment deleted successfully',
  });
});

export const getPaymentStats = asyncHandler(async (req, res) => {
  const stats = await getPaymentOverviewStats();

  res.status(200).json({
    success: true,
    stats,
  });
});

export const getPaymentReports = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const report = await getPaymentReportSummary({ startDate, endDate });

  res.status(200).json({
    success: true,
    report,
  });
});

export const getOutstandingPayments = asyncHandler(async (req, res) => {
  const { clientId } = req.query;
  const options = await getOutstandingPaymentOptions({ clientId });

  res.status(200).json({
    success: true,
    count: options.length,
    options,
  });
});

export const getPaymentInvoices = asyncHandler(async (req, res) => {
  const { status, search, sortBy, startDate, endDate } = req.query;
  const clientId = req.user.role === 'client' ? req.user._id : req.query.clientId;
  const invoices = await getInvoices({
    status,
    clientId,
    search,
    sortBy,
    startDate,
    endDate,
  });

  res.status(200).json({
    success: true,
    count: invoices.length,
    invoices,
  });
});
