import mongoose from 'mongoose';
import Counter from './Counter.js';

const generateOrderNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'orderNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return String(counter.seq);
};

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
    },
    userModel: {
      type: String,
      enum: ['User', 'Client'],
      default: 'Client',
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    items: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          default: null,
        },
        serviceName: {
          type: String,
          trim: true,
          default: '',
        },
        category: {
          type: String,
          trim: true,
          default: '',
        },
        serviceType: {
          type: String,
          enum: ['wash', 'iron', 'dryClean'],
          default: 'wash',
        },
        itemType: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'washing', 'drying', 'ready', 'delivered'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    pickupAddress: {
      type: String,
      trim: true,
      default: '',
    },
    deliveryAddress: {
      type: String,
      trim: true,
      default: '',
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deliveryNotes: {
      type: String,
      default: '',
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'pending', 'failed'],
      default: 'unpaid',
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving
orderSchema.pre('validate', async function (next) {
  if (!this.isNew) {
    return next();
  }

  if (this.orderNumber) {
    return next();
  }

  try {
    this.orderNumber = await generateOrderNumber();
    next();
  } catch (error) {
    next(error);
  }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
