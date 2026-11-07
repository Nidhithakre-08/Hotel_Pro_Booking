import { handler, requireAdmin } from '../../lib/http.js';
import { find } from '../../lib/store.js';
export default handler(async (req, res) => {
  requireAdmin(req);
  const [hotels, rooms, bookings, users] = await Promise.all([find('hotels'), find('rooms'), find('bookings'), find('users')]);
  const live = bookings.filter((b) => b.status !== 'Cancelled');
  const today = new Date().toISOString().slice(0, 10);
  const occupied = new Set(live.filter((b) => b.checkIn <= today && b.checkOut > today && b.status !== 'Completed').map((b) => b.roomId)).size;
  const revenue = live.filter((b) => b.payment?.status === 'Paid').reduce((n, b) => n + b.amount, 0);
  const pending = live.filter((b) => b.payment?.status === 'Pending').reduce((n, b) => n + b.amount, 0);
  res.json({ stats: { hotels: hotels.length, rooms: rooms.length, availableRooms: rooms.filter((r) => r.status === 'Available').length, bookings: bookings.length, activeBookings: bookings.filter((b) => ['Confirmed', 'Checked-in'].includes(b.status)).length, cancelled: bookings.length - live.length, customers: users.length, revenue, pending, occupiedToday: occupied }, recentBookings: bookings.slice(0, 6) });
});
