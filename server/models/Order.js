import mongoose from 'mongoose';

const generateOrderNumber = () => {
  const now = new Date();
  const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeString = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateString}-${timeString}-${randomSuffix}`;
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
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
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
    const Order = mongoose.model('Order');
    let orderNumber;
    let exists = true;

    while (exists) {
      orderNumber = generateOrderNumber();
      exists = await Order.exists({ orderNumber });
    }

    this.orderNumber = orderNumber;
    next();
  } catch (error) {
    next(error);
  }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
