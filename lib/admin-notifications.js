import { insert } from './store.js';

export function notifyAdmin(type, message, details = {}) {
  return insert('notifications', { type, message, details, read: false });
}
