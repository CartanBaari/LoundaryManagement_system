import Expense, { EXPENSE_STATUSES } from '../models/Expense.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDayBounds = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getMonthBounds = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const normalizeExpenseMethod = (method) => {
  const value = String(method || 'cash').trim();
  if (value === 'mobile_money') return 'evc_plus';
  if (value === 'bank') return 'bank_transfer';
  return value || 'cash';
};

const MAX_RECEIPT_CHARS = 2_500_000; // ~1.8MB base64

const buildExpensePayload = (body) => {
  const {
    title,
    amount,
    category,
    payee,
    paymentMethod,
    notes,
    description,
    expenseDate,
    status,
    receiptNumber,
    receiptFileName,
    receiptMimeType,
    receiptData,
  } = body;

  const payload = {};

  if (title !== undefined) payload.title = String(title).trim();
  if (amount !== undefined) payload.amount = toSafeNumber(amount, NaN);
  if (category !== undefined) payload.category = category;
  if (payee !== undefined) payload.payee = payee ? String(payee).trim() : '';
  if (paymentMethod !== undefined) payload.paymentMethod = normalizeExpenseMethod(paymentMethod);
  if (notes !== undefined) payload.notes = notes || '';
  if (description !== undefined) payload.description = description || '';
  if (expenseDate !== undefined) payload.expenseDate = expenseDate ? new Date(expenseDate) : new Date();
  if (status !== undefined && EXPENSE_STATUSES.includes(status)) payload.status = status;
  if (receiptNumber !== undefined) payload.receiptNumber = receiptNumber ? String(receiptNumber).trim() : '';
  if (receiptFileName !== undefined) payload.receiptFileName = receiptFileName || '';
  if (receiptMimeType !== undefined) payload.receiptMimeType = receiptMimeType || '';
  if (receiptData !== undefined) {
    if (receiptData && String(receiptData).length > MAX_RECEIPT_CHARS) {
      const error = new Error('Receipt file is too large. Please upload a file under 2MB.');
      error.statusCode = 400;
      throw error;
    }
    payload.receiptData = receiptData || '';
  }

  return payload;
};

export const getExpenses = asyncHandler(async (req, res) => {
  const { category, status, search, sortBy = '-expenseDate', startDate, endDate } = req.query;
  const filter = {};

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { payee: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { transactionNumber: { $regex: search, $options: 'i' } },
      { receiptNumber: { $regex: search, $options: 'i' } },
    ];
  }

  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) {
      filter.expenseDate.$gte = new Date(`${startDate}T00:00:00.000`);
    }
    if (endDate) {
      filter.expenseDate.$lte = new Date(`${endDate}T23:59:59.999`);
    }
  }

  const expenses = await Expense.find(filter)
    .populate('createdBy', 'name email')
    .sort(sortBy);

  res.status(200).json({
    success: true,
    count: expenses.length,
    expenses,
  });
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id).populate('createdBy', 'name email');

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found',
    });
  }

  res.status(200).json({
    success: true,
    expense,
  });
});

export const getExpenseStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getDayBounds(now);
  const { start: monthStart, end: monthEnd } = getMonthBounds(now);

  const activeMatch = { status: { $ne: 'cancelled' } };

  const [totalAgg, dailyAgg, monthlyAgg, expenseCount] = await Promise.all([
    Expense.aggregate([{ $match: activeMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([
      { $match: { ...activeMatch, expenseDate: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...activeMatch, expenseDate: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.countDocuments(activeMatch),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      dailyExpense: toSafeNumber(dailyAgg[0]?.total, 0),
      monthlyExpense: toSafeNumber(monthlyAgg[0]?.total, 0),
      totalExpense: toSafeNumber(totalAgg[0]?.total, 0),
      expenseCount,
    },
  });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { title, amount, category } = req.body;

  if (!title || amount === undefined || amount === null || amount === '') {
    return res.status(400).json({
      success: false,
      message: 'Please provide expense name and amount',
    });
  }

  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Please select an expense category',
    });
  }

  let payload;
  try {
    payload = buildExpensePayload(req.body);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (!Number.isFinite(payload.amount) || payload.amount < 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a valid non-negative number',
    });
  }

  const expense = await Expense.create({
    ...payload,
    status: payload.status || 'paid',
    createdBy: req.user?._id || null,
  });

  const populated = await Expense.findById(expense._id).populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Expense recorded successfully',
    expense: populated,
  });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found',
    });
  }

  let payload;
  try {
    payload = buildExpensePayload(req.body);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (payload.amount !== undefined && (!Number.isFinite(payload.amount) || payload.amount < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a valid non-negative number',
    });
  }

  Object.assign(expense, payload);
  await expense.save();

  const populated = await Expense.findById(expense._id).populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    expense: populated,
  });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found',
    });
  }

  await expense.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Expense deleted successfully',
  });
});
