import Counter from '../models/Counter.js';

/**
 * Generate sequential transaction numbers: TRX-000001, TRX-000002, ...
 */
export const generateTransactionNumber = async (session = null) => {
  const query = Counter.findByIdAndUpdate(
    'transaction',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (session) {
    query.session(session);
  }

  const counter = await query;
  const seq = counter.seq || 1;
  return `TRX-${String(seq).padStart(6, '0')}`;
};
