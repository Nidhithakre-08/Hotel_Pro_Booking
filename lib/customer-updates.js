import { insert } from './store.js';

export function notifyCustomers(type, message, details = {}) {
  return insert('customer_updates', { type, message, details });
}
