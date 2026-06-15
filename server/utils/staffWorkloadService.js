import Order from '../models/Order.js';
import User from '../models/User.js';
import { findUsersByRoles } from './userRoleService.js';

export const DEFAULT_DAILY_CAPACITY = 10;

export const parseDateInput = (dateInput = new Date()) => {
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match.map(Number);
      return new Date(year, month - 1, day);
    }
  }

  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const getDayBounds = (dateInput = new Date()) => {
  const parsed = parseDateInput(dateInput);
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export const countStaffOrdersForDate = async (staffId, dateInput, excludeOrderId = null) => {
  if (!staffId) {
    return 0;
  }

  const { start, end } = getDayBounds(dateInput);
  const filter = {
    assignedStaff: staffId,
    status: { $ne: 'delivered' },
    pickupDate: { $gte: start, $lt: end },
  };

  if (excludeOrderId) {
    filter._id = { $ne: excludeOrderId };
  }

  return Order.countDocuments(filter);
};

export const buildWorkloadSummary = (assignedCount, dailyCapacity) => ({
  assignedCount,
  dailyCapacity,
  remainingCapacity: Math.max(0, dailyCapacity - assignedCount),
  isAtCapacity: assignedCount >= dailyCapacity,
});

export const validateStaffAssignment = async (staffId, pickupDate, excludeOrderId = null) => {
  const staff = await User.findById(staffId).select('name dailyCapacity isActive');

  if (!staff || !staff.isActive) {
    return {
      valid: false,
      message: 'Selected staff member was not found',
    };
  }

  const dailyCapacity = staff.dailyCapacity ?? DEFAULT_DAILY_CAPACITY;
  const assignedCount = await countStaffOrdersForDate(staffId, pickupDate, excludeOrderId);
  const summary = buildWorkloadSummary(assignedCount, dailyCapacity);

  if (summary.isAtCapacity) {
    return {
      valid: false,
      message: `${staff.name} already has ${assignedCount}/${dailyCapacity} orders scheduled for this day`,
      staffName: staff.name,
      ...summary,
    };
  }

  return {
    valid: true,
    staffName: staff.name,
    ...summary,
  };
};

export const getStaffWorkloads = async (dateInput = new Date(), excludeOrderId = null) => {
  const staffMembers = await findUsersByRoles(['staff'], { isActive: true });

  const workloads = await Promise.all(
    staffMembers.map(async (member) => {
      const dailyCapacity = member.dailyCapacity ?? DEFAULT_DAILY_CAPACITY;
      const assignedCount = await countStaffOrdersForDate(member._id, dateInput, excludeOrderId);
      const summary = buildWorkloadSummary(assignedCount, dailyCapacity);

      return {
        staffId: member._id.toString(),
        name: member.name,
        email: member.email,
        phone: member.phone,
        dailyCapacity,
        ...summary,
      };
    })
  );

  return workloads.sort((a, b) => a.name.localeCompare(b.name));
};
