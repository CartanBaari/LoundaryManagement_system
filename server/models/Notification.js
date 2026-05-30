import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipientModel',
      required: true,
    },
    recipientModel: {
      type: String,
      enum: ['User', 'Client'],
      default: 'User',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'order_created',
        'status_update',
        'ready_for_delivery',
        'delivered',
        'order_cancelled',
        'system',
        'assignment',
        'admin_message',
        'new_order',
        'ready_order',
      ],
      default: 'system',
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto delete notifications older than 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
