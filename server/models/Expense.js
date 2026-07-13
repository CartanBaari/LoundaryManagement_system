import mongoose from 'mongoose';
import { generateTransactionNumber } from '../utils/transactionNumber.js';

const EXPENSE_STATUSES = ['paid', 'pending', 'cancelled'];

const expenseSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide an expense name'],
      trim: true,
      maxlength: [150, 'Expense name cannot exceed 150 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an expense amount'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    payee: {
      type: String,
      trim: true,
      maxlength: [150, 'Supplier cannot exceed 150 characters'],
      default: '',
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'cash',
    },
    status: {
      type: String,
      enum: EXPENSE_STATUSES,
      default: 'paid',
    },
    receiptNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Receipt number cannot exceed 100 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    receiptFileName: {
      type: String,
      trim: true,
      default: '',
    },
    receiptMimeType: {
      type: String,
      trim: true,
      default: '',
    },
    receiptData: {
      type: String,
      default: '',
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });

expenseSchema.pre('validate', async function (next) {
  if (!this.isNew || this.transactionNumber) {
    return next();
  }

  try {
    this.transactionNumber = await generateTransactionNumber();
    next();
  } catch (error) {
    next(error);
  }
});

export { EXPENSE_STATUSES };
const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
