import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import { getDayBounds, parseDateInput } from './staffWorkloadService.js';

export const getDailyOrderLimit = async () => {
  const settings = await Settings.findOne({ key: 'dailyOrderLimit' });
  const limit = Number(settings?.value);
  return Number.isFinite(limit) && limit > 0 ? limit : 20;
};

export const countNonUrgentOrdersForDate = async (dateInput = new Date()) => {
  const { start, end } = getDayBounds(dateInput);

  return Order.countDocuments({
    isUrgent: { $ne: true },
    pickupDate: { $gte: start, $lt: end },
  });
};

export const getDailyLimitStatus = async (dateInput = new Date()) => {
  const targetDate = parseDateInput(dateInput);
  const dailyLimit = await getDailyOrderLimit();
  const used = await countNonUrgentOrdersForDate(targetDate);
  const remaining = Math.max(0, dailyLimit - used);
  const dateLabel = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

  return {
    date: dateLabel,
    dailyLimit,
    used,
    remaining,
    isFull: used >= dailyLimit,
  };
};

const formatDateLabel = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const findNextAvailablePickupDate = async (dateInput = new Date(), maxDays = 365) => {
  const dailyLimit = await getDailyOrderLimit();
  const candidate = parseDateInput(dateInput);

  for (let dayOffset = 0; dayOffset < maxDays; dayOffset += 1) {
    const ordersOnDate = await countNonUrgentOrdersForDate(candidate);

    if (ordersOnDate < dailyLimit) {
      return {
        scheduledDate: candidate,
        rescheduled: dayOffset > 0,
        dateLabel: formatDateLabel(candidate),
      };
    }

    candidate.setDate(candidate.getDate() + 1);
  }

  return {
    scheduledDate: candidate,
    rescheduled: true,
    dateLabel: formatDateLabel(candidate),
  };
};

export const resolvePickupSchedule = async ({ pickupDate, deliveryDate, isUrgent = false }) => {
  const originalPickup = parseDateInput(pickupDate);
  const originalDelivery = parseDateInput(deliveryDate);
  const daySpanMs = originalDelivery.getTime() - originalPickup.getTime();

  if (isUrgent) {
    return {
      scheduledDate: originalPickup,
      scheduledDeliveryDate: originalDelivery,
      rescheduled: false,
      message: 'Order created successfully',
    };
  }

  const dailyLimit = await getDailyOrderLimit();
  const availability = await findNextAvailablePickupDate(originalPickup);
  const scheduledDate = availability.scheduledDate;
  const scheduledDeliveryDate = new Date(scheduledDate.getTime() + daySpanMs);

  if (!availability.rescheduled) {
    return {
      scheduledDate,
      scheduledDeliveryDate,
      rescheduled: false,
      message: 'Order created successfully',
    };
  }

  return {
    scheduledDate,
    scheduledDeliveryDate,
    rescheduled: true,
    message: `Daily order limit reached (${dailyLimit}/${dailyLimit}). Order automatically scheduled for ${availability.dateLabel}.`,
  };
};
