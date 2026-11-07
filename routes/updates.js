import { handler, methodNotAllowed, getAuth } from '../lib/http.js';
import { find } from '../lib/store.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  const auth = getAuth(req);
  const userId = auth?.role === 'guest' ? auth.sub : null;
  const updates = (await find('customer_updates')).filter((item) => !item.details?.userId || item.details.userId === userId);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(req.query?.date || '') ? req.query.date : new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date(`${today}T12:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const reminders = [];
  if (userId) {
    const bookings = await find('bookings', { userId });
    for (const booking of bookings) {
      if (!['Confirmed', 'Checked-in'].includes(booking.status)) continue;
      const reminder = booking.checkIn === today ? 'today' : booking.checkIn === tomorrow ? 'tomorrow' : null;
      if (!reminder) continue;
      reminders.push({
        id: `booking-reminder-${booking.id}-${reminder}`,
        type: 'booking_reminder',
        message: reminder === 'today'
          ? `Your stay at ${booking.hotelName} starts today. Booking ${booking.bookingCode}.`
          : `Your stay at ${booking.hotelName} starts tomorrow. Booking ${booking.bookingCode}.`,
        details: { userId, bookingId: booking.id, reminder },
        createdAt: new Date().toISOString(),
      });
    }
  }
  return res.json({ updates: [...reminders, ...updates].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 50) });
});
