import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import Client from '../models/Client.js';

export const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const resolveInvoiceStatus = (paidAmount, netTotal) => {
  if (paidAmount <= 0) {
    return 'unpaid';
  }

  if (paidAmount >= netTotal) {
    return 'paid';
  }

  return 'partially_paid';
};

export const resolvePaymentRecordStatus = (invoiceStatus) => {
  if (invoiceStatus === 'partially_paid') {
    return 'partial';
  }

  return invoiceStatus;
};

export const buildInvoiceNumber = (orderNumber) => `INV-${orderNumber}`;

export const recalculateClientOutstandingBalance = async (clientId, session) => {
  const [result] = await Invoice.aggregate([
    {
      $match: {
        clientId: new mongoose.Types.ObjectId(clientId),
        status: { $in: ['unpaid', 'partially_paid'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$remainingAmount' },
      },
    },
  ]).session(session);

  const outstandingBalance = toSafeNumber(result?.total, 0);

  await Client.findByIdAndUpdate(
    clientId,
    { outstandingBalance },
    { session, runValidators: true }
  );

  return outstandingBalance;
};

const findOrCreateInvoice = async ({ order, clientId, totalAmount, discount, dueDate, session }) => {
  let invoice = await Invoice.findOne({ orderId: order._id }).session(session);
  const normalizedDiscount = Math.max(0, toSafeNumber(discount, 0));
  const normalizedTotal = Math.max(0, toSafeNumber(totalAmount, order.totalAmount || 0));

  if (normalizedDiscount > normalizedTotal) {
    const error = new Error('Discount cannot exceed the total amount');
    error.statusCode = 400;
    throw error;
  }

  const netTotal = Math.max(0, normalizedTotal - normalizedDiscount);

  if (invoice) {
    if (invoice.paidAmount > netTotal) {
      const error = new Error(
        `Discount is too high. Already paid ${invoice.paidAmount.toFixed(2)} exceeds the discounted total ${netTotal.toFixed(2)}`
      );
      error.statusCode = 400;
      throw error;
    }

    invoice.totalAmount = normalizedTotal;
    invoice.discount = normalizedDiscount;
    invoice.remainingAmount = Math.max(0, netTotal - invoice.paidAmount);
    invoice.status = resolveInvoiceStatus(invoice.paidAmount, netTotal);

    if (dueDate && !invoice.dueDate) {
      invoice.dueDate = new Date(dueDate);
    }

    await invoice.save({ session });
    return invoice;
  }

  const created = await Invoice.create(
    [
      {
        invoiceNumber: buildInvoiceNumber(order.orderNumber),
        orderId: order._id,
        clientId,
        totalAmount: normalizedTotal,
        discount: normalizedDiscount,
        paidAmount: 0,
        remainingAmount: netTotal,
        status: 'unpaid',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    ],
    { session }
  );

  return created[0];
};

export const recordPayment = async ({
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
  notes,
}) => {
  const transactionAmount = Math.max(0, toSafeNumber(amountPaid, 0));

  if (transactionAmount <= 0) {
    const error = new Error('Payment amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let createdPayment;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session).populate('userId', 'name phone');

      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }

      if (order.userModel !== 'Client') {
        const error = new Error('Payments can only be recorded for client orders');
        error.statusCode = 400;
        throw error;
      }

      const resolvedClientId = clientId || order.userId?._id?.toString();

      if (!resolvedClientId) {
        const error = new Error('Client information is missing for this order');
        error.statusCode = 400;
        throw error;
      }

      if (clientId && order.userId?._id?.toString() !== clientId) {
        const error = new Error('Selected client does not match the selected order');
        error.statusCode = 400;
        throw error;
      }

      const invoice = await findOrCreateInvoice({
        order,
        clientId: resolvedClientId,
        totalAmount,
        discount,
        dueDate,
        session,
      });

      const netTotal = Math.max(0, invoice.totalAmount - invoice.discount);
      const nextPaidAmount = invoice.paidAmount + transactionAmount;

      if (nextPaidAmount > netTotal) {
        const error = new Error(
          `Payment exceeds remaining balance. Remaining: ${Math.max(0, netTotal - invoice.paidAmount).toFixed(2)}`
        );
        error.statusCode = 400;
        throw error;
      }

      const nextRemainingAmount = Math.max(0, netTotal - nextPaidAmount);
      const invoiceStatus = resolveInvoiceStatus(nextPaidAmount, netTotal);
      const paymentRecordStatus = resolvePaymentRecordStatus(invoiceStatus);

      if (dueDate && !invoice.dueDate) {
        invoice.dueDate = new Date(dueDate);
      }

      invoice.paidAmount = nextPaidAmount;
      invoice.remainingAmount = nextRemainingAmount;
      invoice.status = invoiceStatus;
      await invoice.save({ session });

      order.paymentStatus = invoiceStatus;
      await order.save({ session });

      const [payment] = await Payment.create(
        [
          {
            invoiceId: invoice._id,
            orderId: order._id,
            clientId: resolvedClientId,
            customerName: customerName || order.userId?.name || 'Unknown Customer',
            phoneNumber: phoneNumber || order.userId?.phone || '',
            totalAmount: invoice.totalAmount,
            amountPaid: transactionAmount,
            remainingBalance: nextRemainingAmount,
            discount: invoice.discount,
            paymentMethod: ['cash', 'mobile_money', 'bank'].includes(paymentMethod) ? paymentMethod : 'cash',
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            dueDate: invoice.dueDate,
            status: paymentRecordStatus,
            notes: notes || '',
          },
        ],
        { session }
      );

      await recalculateClientOutstandingBalance(resolvedClientId, session);

      createdPayment = payment;
    });

    return createdPayment;
  } finally {
    session.endSession();
  }
};

const getDayBounds = (dateInput = new Date()) => {
  const start = new Date(dateInput);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateInput);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const parseDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(`${startDate}T00:00:00.000`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
  return { start, end };
};

export const getPaymentOverviewStats = async () => {
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getDayBounds(now);

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = new Date(lastWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    collectedAgg,
    todayCollectedAgg,
    lastWeekCollectedAgg,
    prevWeekCollectedAgg,
    outstandingAgg,
    paymentCount,
    paidInvoiceCount,
    invoiceCount,
  ] = await Promise.all([
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: lastWeekStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: prevWeekStart, $lt: lastWeekStart } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
    Invoice.aggregate([
      { $match: { status: { $in: ['unpaid', 'partially_paid'] } } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } },
    ]),
    Payment.countDocuments(),
    Invoice.countDocuments({ status: 'paid' }),
    Invoice.countDocuments(),
  ]);

  const totalCollected = toSafeNumber(collectedAgg[0]?.total, 0);
  const todayCollected = toSafeNumber(todayCollectedAgg[0]?.total, 0);
  const lastWeekCollected = toSafeNumber(lastWeekCollectedAgg[0]?.total, 0);
  const prevWeekCollected = toSafeNumber(prevWeekCollectedAgg[0]?.total, 0);
  const totalOutstanding = toSafeNumber(outstandingAgg[0]?.total, 0);
  const collectionRate = invoiceCount > 0 ? Math.round((paidInvoiceCount / invoiceCount) * 100) : 0;

  return {
    totalRevenue: totalCollected,
    todayRevenue: todayCollected,
    totalCollected,
    todayCollected,
    lastWeekCollected,
    prevWeekCollected,
    totalOutstanding,
    paymentCount,
    invoiceCount,
    paidInvoiceCount,
    collectionRate,
  };
};

export const getPaymentReportSummary = async ({ startDate, endDate } = {}) => {
  const { start, end } = parseDateRange(startDate, endDate);
  const paymentFilter = {};

  if (start || end) {
    paymentFilter.paymentDate = {};
    if (start) paymentFilter.paymentDate.$gte = start;
    if (end) paymentFilter.paymentDate.$lte = end;
  }

  const payments = await Payment.find(paymentFilter)
    .sort({ paymentDate: -1 })
    .populate('clientId', 'name phone email')
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount paymentStatus status',
    })
    .populate('invoiceId', 'invoiceNumber paidAmount remainingAmount status totalAmount discount');

  const revenue = payments.reduce((sum, payment) => sum + toSafeNumber(payment.amountPaid, 0), 0);

  const revenueByDayMap = new Map();
  const paymentMethodsMap = new Map();

  payments.forEach((payment) => {
    const dayKey = new Date(payment.paymentDate).toISOString().slice(0, 10);
    revenueByDayMap.set(dayKey, (revenueByDayMap.get(dayKey) || 0) + toSafeNumber(payment.amountPaid, 0));

    const method = payment.paymentMethod || 'cash';
    paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + 1);
  });

  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, count]) => ({
    method,
    count,
  }));

  const invoiceFilter = {};
  if (start || end) {
    invoiceFilter.updatedAt = {};
    if (start) invoiceFilter.updatedAt.$gte = start;
    if (end) invoiceFilter.updatedAt.$lte = end;
  }

  const invoices = await Invoice.find(invoiceFilter)
    .sort({ updatedAt: -1 })
    .populate('clientId', 'name phone email')
    .populate({
      path: 'orderId',
      select: 'orderNumber status paymentStatus totalAmount',
    });

  return {
    revenue,
    paymentCount: payments.length,
    payments,
    paymentHistory: payments,
    revenueByDay,
    paymentMethods,
    invoices,
    invoiceSummary: {
      unpaid: invoices.filter((invoice) => invoice.status === 'unpaid').length,
      partiallyPaid: invoices.filter((invoice) => invoice.status === 'partially_paid').length,
      paid: invoices.filter((invoice) => invoice.status === 'paid').length,
    },
  };
};

const invoiceOrderPopulate = {
  path: 'orderId',
  select:
    'orderNumber totalAmount status paymentStatus userId userModel items createdAt deliveryDate deliveryNotes',
  populate: {
    path: 'userId',
    select: 'name phone email',
  },
};

const matchesInvoiceSearch = (row, search) => {
  if (!search?.trim()) {
    return true;
  }

  const query = search.trim().toLowerCase();
  const haystack = [
    row.invoiceNumber,
    row.orderNumber,
    row.customerName,
    row.customerPhone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const mapInvoiceDocumentToRow = (invoice) => {
  const order = invoice.orderId;
  const client = invoice.clientId;
  const customer = order?.userId || client;
  const discount = toSafeNumber(invoice.discount, 0);
  const totalAmount = toSafeNumber(invoice.totalAmount, 0);
  const paidAmount = toSafeNumber(invoice.paidAmount, 0);
  const dueAmount = toSafeNumber(invoice.remainingAmount, Math.max(0, totalAmount - discount - paidAmount));

  return {
    id: invoice._id.toString(),
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: order?._id || null,
    orderNumber: order?.orderNumber || '',
    clientId: client?._id || invoice.clientId,
    customerName: customer?.name || 'Unknown Customer',
    customerPhone: customer?.phone || '',
    customerEmail: customer?.email || '',
    totalAmount,
    discount,
    paidAmount,
    dueAmount,
    status: invoice.status,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    order,
    invoice,
  };
};

const mapOrderToInvoiceRow = (order, paidAmount = 0) => {
  const totalAmount = toSafeNumber(order.totalAmount, 0);
  const normalizedPaidAmount = toSafeNumber(paidAmount, 0);
  const dueAmount = Math.max(0, totalAmount - normalizedPaidAmount);
  const status = resolveInvoiceStatus(normalizedPaidAmount, totalAmount);

  return {
    id: order._id.toString(),
    invoiceId: null,
    invoiceNumber: buildInvoiceNumber(order.orderNumber),
    orderId: order._id,
    orderNumber: order.orderNumber,
    clientId: order.userId?._id || order.userId,
    customerName: order.userId?.name || 'Unknown Customer',
    customerPhone: order.userId?.phone || '',
    customerEmail: order.userId?.email || '',
    totalAmount,
    discount: 0,
    paidAmount: normalizedPaidAmount,
    dueAmount,
    status,
    createdAt: order.createdAt,
    dueDate: order.deliveryDate || null,
    order,
    invoice: null,
  };
};

export const getInvoices = async ({
  status,
  clientId,
  search,
  startDate,
  endDate,
  sortBy = '-createdAt',
} = {}) => {
  const invoiceFilter = {};

  if (clientId) {
    invoiceFilter.clientId = clientId;
  }

  if (startDate || endDate) {
    invoiceFilter.createdAt = {};
    if (startDate) {
      invoiceFilter.createdAt.$gte = new Date(`${startDate}T00:00:00.000`);
    }
    if (endDate) {
      invoiceFilter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
    }
  }

  const invoices = await Invoice.find(invoiceFilter)
    .populate('clientId', 'name phone email outstandingBalance')
    .populate(invoiceOrderPopulate)
    .sort(sortBy);

  const invoicedOrderIds = invoices.map((invoice) => invoice.orderId?._id).filter(Boolean);

  const orderFilter = {
    userModel: 'Client',
    _id: { $nin: invoicedOrderIds },
  };

  if (clientId) {
    orderFilter.userId = clientId;
  }

  if (startDate || endDate) {
    orderFilter.createdAt = invoiceFilter.createdAt;
  }

  const ordersWithoutInvoice = await Order.find(orderFilter)
    .populate('userId', 'name phone email')
    .select('orderNumber totalAmount status paymentStatus userId userModel items createdAt deliveryDate deliveryNotes')
    .sort('-createdAt');

  const orderIds = ordersWithoutInvoice.map((order) => order._id);
  const paymentSums =
    orderIds.length > 0
      ? await Payment.aggregate([
          { $match: { orderId: { $in: orderIds } } },
          { $group: { _id: '$orderId', totalPaid: { $sum: '$amountPaid' } } },
        ])
      : [];

  const paidByOrder = new Map(
    paymentSums.map((entry) => [entry._id.toString(), toSafeNumber(entry.totalPaid, 0)])
  );

  let rows = [
    ...invoices.map(mapInvoiceDocumentToRow),
    ...ordersWithoutInvoice.map((order) =>
      mapOrderToInvoiceRow(order, paidByOrder.get(order._id.toString()) ?? 0)
    ),
  ];

  if (status) {
    rows = rows.filter((row) => row.status === status);
  }

  if (search) {
    rows = rows.filter((row) => matchesInvoiceSearch(row, search));
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return rows;
};

export const getOutstandingPaymentOptions = async ({ clientId } = {}) => {
  const invoiceFilter = {
    status: { $in: ['unpaid', 'partially_paid'] },
    remainingAmount: { $gt: 0 },
  };

  if (clientId) {
    invoiceFilter.clientId = clientId;
  }

  const outstandingInvoices = await Invoice.find(invoiceFilter)
    .populate('clientId', 'name phone email outstandingBalance')
    .populate({
      path: 'orderId',
      select: 'orderNumber totalAmount status paymentStatus userId userModel',
      populate: {
        path: 'userId',
        select: 'name phone email',
      },
    })
    .sort('-updatedAt');

  const allInvoicedOrderIds = await Invoice.distinct('orderId');

  const orderFilter = {
    userModel: 'Client',
    _id: { $nin: allInvoicedOrderIds },
  };

  if (clientId) {
    orderFilter.userId = clientId;
  }

  const ordersWithoutInvoice = await Order.find(orderFilter)
    .populate('userId', 'name phone email')
    .sort('-createdAt');

  const orderIds = [
    ...outstandingInvoices.map((invoice) => invoice.orderId?._id).filter(Boolean),
    ...ordersWithoutInvoice.map((order) => order._id),
  ];

  const paymentSums =
    orderIds.length > 0
      ? await Payment.aggregate([
          { $match: { orderId: { $in: orderIds } } },
          { $group: { _id: '$orderId', totalPaid: { $sum: '$amountPaid' } } },
        ])
      : [];

  const paidByOrder = new Map(
    paymentSums.map((entry) => [entry._id.toString(), toSafeNumber(entry.totalPaid, 0)])
  );

  const mapInvoiceOption = (invoice) => {
    const order = invoice.orderId;
    const orderId = order?._id?.toString();
    const alreadyPaid = orderId ? paidByOrder.get(orderId) ?? toSafeNumber(invoice.paidAmount, 0) : toSafeNumber(invoice.paidAmount, 0);
    const totalAmount = toSafeNumber(invoice.totalAmount, 0);
    const discount = toSafeNumber(invoice.discount, 0);
    const netTotal = Math.max(0, totalAmount - discount);
    const remainingBalance = Math.max(0, netTotal - alreadyPaid);

    return {
      invoiceId: invoice._id,
      orderId: order?._id || null,
      orderNumber: order?.orderNumber || '',
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId?._id || invoice.clientId,
      customerName: order?.userId?.name || invoice.clientId?.name || 'Unknown Customer',
      phoneNumber: order?.userId?.phone || invoice.clientId?.phone || '',
      totalAmount,
      discount,
      alreadyPaid,
      remainingBalance,
      status: invoice.status,
    };
  };

  const mapOrderOption = (order) => {
    const orderId = order._id.toString();
    const alreadyPaid = paidByOrder.get(orderId) ?? 0;
    const totalAmount = toSafeNumber(order.totalAmount, 0);
    const remainingBalance = Math.max(0, totalAmount - alreadyPaid);

    return {
      invoiceId: null,
      orderId: order._id,
      orderNumber: order.orderNumber,
      invoiceNumber: null,
      clientId: order.userId?._id || order.userId,
      customerName: order.userId?.name || 'Unknown Customer',
      phoneNumber: order.userId?.phone || '',
      totalAmount,
      discount: 0,
      alreadyPaid,
      remainingBalance,
      status: 'unpaid',
    };
  };

  const options = [
    ...outstandingInvoices.map(mapInvoiceOption),
    ...ordersWithoutInvoice.map(mapOrderOption),
  ].filter((option) => option.remainingBalance > 0 && option.orderId);

  return options;
};
