import User from '../models/User.js';
import UserRole from '../models/UserRole.js';

export const DEFAULT_ROLE = 'client';

const normalizeRole = (role) => {
  if (['admin', 'staff', 'client'].includes(role)) {
    return role;
  }

  return DEFAULT_ROLE;
};

const isSupportedRole = (role) => ['admin', 'staff', 'client'].includes(role);

const toPlainObject = (user) => {
  if (!user) {
    return user;
  }

  if (typeof user.toObject === 'function') {
    return user.toObject();
  }

  return { ...user };
};

export const upsertUserRole = async (userId, role = DEFAULT_ROLE) => {
  if (!userId) {
    return null;
  }

  return UserRole.findOneAndUpdate(
    { userId },
    { role: normalizeRole(role) },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export const getRoleMapForUserIds = async (userIds = []) => {
  const validUserIds = [...new Set(userIds.filter(Boolean).map((id) => id.toString()))];

  if (!validUserIds.length) {
    return new Map();
  }

  const userRoles = await UserRole.find({ userId: { $in: validUserIds } }).lean();

  return new Map(userRoles.map((entry) => [entry.userId.toString(), entry.role]));
};

export const attachRoleToUser = async (user) => {
  if (!user) {
    return user;
  }

  const roleMap = await getRoleMapForUserIds([user._id]);
  const userObject = toPlainObject(user);
  userObject.role = roleMap.get(user._id.toString()) || DEFAULT_ROLE;

  return userObject;
};

export const attachRoleToUsers = async (users = []) => {
  if (!users.length) {
    return [];
  }

  const roleMap = await getRoleMapForUserIds(users.map((user) => user._id));

  return users.map((user) => {
    const userObject = toPlainObject(user);
    userObject.role = roleMap.get(user._id.toString()) || DEFAULT_ROLE;
    return userObject;
  });
};

export const getUserIdsByRoles = async (roles = []) => {
  const normalizedRoles = [...new Set(roles.filter(isSupportedRole))];

  if (!normalizedRoles.length) {
    return [];
  }

  const userRoles = await UserRole.find({ role: { $in: normalizedRoles } }).select('userId').lean();

  return userRoles.map((entry) => entry.userId);
};

export const deleteUserRole = async (userId) => {
  if (!userId) {
    return null;
  }

  return UserRole.findOneAndDelete({ userId });
};

export const findUsersByRoles = async (roles = [], userFilter = {}) => {
  const userIds = await getUserIdsByRoles(roles);

  if (!userIds.length) {
    return [];
  }

  const users = await User.find({
    ...userFilter,
    _id: { $in: userIds },
  });

  return attachRoleToUsers(users);
};

export const findUserByIdAndRole = async (userId, role, userFilter = {}) => {
  if (!userId) {
    return null;
  }

  const userRole = await UserRole.findOne({ userId, role: normalizeRole(role) }).lean();

  if (!userRole) {
    return null;
  }

  const user = await User.findOne({ _id: userId, ...userFilter });

  if (!user) {
    return null;
  }

  return attachRoleToUser(user);
};

export const migrateLegacyUserRoles = async () => {
  const legacyUsers = await User.find(
    {
      role: { $exists: true, $in: ['admin', 'staff', 'client'] },
    },
    { _id: 1, role: 1 }
  ).lean();

  if (!legacyUsers.length) {
    return { migrated: 0, cleaned: 0 };
  }

  await Promise.all(
    legacyUsers.map((user) => upsertUserRole(user._id, user.role))
  );

  const cleanupResult = await User.updateMany(
    { _id: { $in: legacyUsers.map((user) => user._id) } },
    { $unset: { role: 1 } }
  );

  return {
    migrated: legacyUsers.length,
    cleaned: cleanupResult.modifiedCount || 0,
  };
};
