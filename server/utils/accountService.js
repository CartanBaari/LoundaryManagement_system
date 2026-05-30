import Client from '../models/Client.js';
import User from '../models/User.js';
import UserRole from '../models/UserRole.js';
import { attachRoleToUser, findUsersByRoles } from './userRoleService.js';

export const ACCOUNT_MODELS = {
  User,
  Client,
};

export const getModelNameForRole = (role) => (role === 'client' ? 'Client' : 'User');

export const attachAccountRole = async (account, modelName = null) => {
  if (!account) {
    return account;
  }

  const resolvedModelName = modelName || account.constructor?.modelName;

  if (resolvedModelName === 'Client') {
    const client = typeof account.toObject === 'function' ? account.toObject() : { ...account };
    client.role = 'client';
    client.model = 'Client';
    return client;
  }

  const user = await attachRoleToUser(account);
  user.model = 'User';
  return user;
};

export const findAccountByEmail = async (email, includePassword = false) => {
  const clientQuery = Client.findOne({ email });
  const userQuery = User.findOne({ email });

  if (includePassword) {
    clientQuery.select('+password');
    userQuery.select('+password');
  }

  const [client, user] = await Promise.all([clientQuery, userQuery]);

  if (user) {
    return {
      account: user,
      model: 'User',
    };
  }

  if (client) {
    return {
      account: client,
      model: 'Client',
    };
  }

  return {
    account: null,
    model: null,
  };
};

export const findAccountById = async (id, modelName) => {
  const Model = ACCOUNT_MODELS[modelName];

  if (!Model || !id) {
    return null;
  }

  const account = await Model.findById(id);
  return attachAccountRole(account, modelName);
};

export const findClientById = async (id, filter = {}) => {
  if (!id) {
    return null;
  }

  const client = await Client.findOne({ _id: id, ...filter });
  return attachAccountRole(client, 'Client');
};

export const findClients = async (filter = {}) => {
  const clients = await Client.find(filter);
  return Promise.all(clients.map((client) => attachAccountRole(client, 'Client')));
};

export const findStaffUsers = async (filter = {}) => {
  return findUsersByRoles(['staff'], filter);
};

export const findAdminAndStaffUsers = async (role, filter = {}) => {
  const roles = role ? [role] : ['admin', 'staff'];
  return findUsersByRoles(roles, filter);
};

export const migrateLegacyClients = async () => {
  await User.db.collection('orders').updateMany(
    { userModel: { $exists: false } },
    { $set: { userModel: 'User' } }
  );

  await User.db.collection('notifications').updateMany(
    { recipientModel: { $exists: false } },
    { $set: { recipientModel: 'User' } }
  );

  const legacyClientRoles = await UserRole.find({ role: 'client' }).lean();

  if (!legacyClientRoles.length) {
    return { migrated: 0, updatedOrders: 0, updatedNotifications: 0 };
  }

  const clientIds = legacyClientRoles.map((entry) => entry.userId);
  const legacyUsers = await User.find({ _id: { $in: clientIds } })
    .select('+password')
    .lean();

  if (!legacyUsers.length) {
    return { migrated: 0, updatedOrders: 0, updatedNotifications: 0 };
  }

  const existingClients = await Client.find({ _id: { $in: clientIds } }).select('_id').lean();
  const existingClientIds = new Set(existingClients.map((client) => client._id.toString()));

  const clientsToInsert = legacyUsers
    .filter((user) => !existingClientIds.has(user._id.toString()))
    .map(({ _id, name, email, password, phone, address, isActive, avatar, createdAt, updatedAt }) => ({
      _id,
      name,
      email,
      password,
      role: 'client',
      phone,
      address,
      isActive,
      avatar,
      createdAt,
      updatedAt,
    }));

  if (clientsToInsert.length) {
    await Client.collection.insertMany(clientsToInsert);
  }

  await Client.updateMany(
    { role: { $exists: false } },
    { $set: { role: 'client' } }
  );

  const orderUpdate = await User.db.collection('orders').updateMany(
    { userId: { $in: clientIds } },
    { $set: { userModel: 'Client' } }
  );

  const notificationUpdate = await User.db.collection('notifications').updateMany(
    { userId: { $in: clientIds } },
    { $set: { recipientModel: 'Client' } }
  );

  await User.deleteMany({ _id: { $in: clientIds } });
  await UserRole.deleteMany({ userId: { $in: clientIds } });

  return {
    migrated: clientsToInsert.length,
    updatedOrders: orderUpdate.modifiedCount || 0,
    updatedNotifications: notificationUpdate.modifiedCount || 0,
  };
};
