import mongoose from 'mongoose';
import { generateTransactionNumber } from '../utils/transactionNumber.js';

const generatePaymentId = () => {
  const now = new Date();
  const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeString = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${dateString}-${timeString}-${randomSuffix}`;
};

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      required: true,
    },
    transactionNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'cash',
    },
    incomeCategory: {
      type: String,
      trim: true,
      default: 'laundry_service',
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'unpaid',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.pre('validate', async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    if (!this.paymentId) {
      const Payment = mongoose.model('Payment');
      let paymentId;
      let exists = true;

      while (exists) {
        paymentId = generatePaymentId();
        exists = await Payment.exists({ paymentId });
      }

      this.paymentId = paymentId;
    }

    if (!this.transactionNumber) {
      this.transactionNumber = await generateTransactionNumber();
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
