import { handler, methodNotAllowed, getAuth, str, HttpError } from '../../lib/http.js';
import { find, findOne, update, remove } from '../../lib/store.js';
import { validateGuest, BOOKING_STATUSES, PAYMENT_STATUSES } from '../../lib/booking.js';
import { notifyAdmin } from '../../lib/admin-notifications.js';
import { notifyCustomers } from '../../lib/customer-updates.js';

export default handler(async (req, res) => {
  const auth = getAuth(req);
  if (!auth) throw new HttpError(401, 'Please sign in.');
  const isAdmin = auth.role === 'admin';
  const id = req.query.id;
  const booking = (await findOne('bookings', { id })) || (await findOne('bookings', { bookingCode: id }));
  if (!booking || (!isAdmin && booking.userId !== auth.sub)) throw new HttpError(404, 'Booking not found.');
  if (req.method === 'GET') return res.json({ booking });
  if (req.method === 'PUT') {
    const b = req.body || {};
    const patch = {};
    if (b.status !== undefined) {
      if (!BOOKING_STATUSES.includes(b.status)) throw new HttpError(400, 'Invalid status.');
      if (!isAdmin && b.status !== 'Cancelled') throw new HttpError(403, 'You can only cancel your own booking.');
      if (!isAdmin && booking.status !== 'Confirmed') throw new HttpError(409, 'Only confirmed bookings can be cancelled.');
      patch.status = b.status;
      if (b.status === 'Cancelled') {
        patch.cancelledAt = new Date().toISOString();
        if (booking.payment?.status === 'Paid') patch.payment = { ...booking.payment, status: 'Refunded', refundedAt: new Date().toISOString() };
      }
    }
    if (isAdmin && b.paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.includes(b.paymentStatus)) throw new HttpError(400, 'Invalid payment status.');
      patch.payment = { ...(patch.payment || booking.payment), status: b.paymentStatus };
    }
    if (b.guest !== undefined) {
      if (booking.status === 'Cancelled' || booking.status === 'Completed') throw new HttpError(409, 'This booking can no longer be edited.');
      patch.guest = validateGuest({ ...booking.guest, ...b.guest });
    }
    if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update.');
    const updatedBooking = await update('bookings', booking.id, patch);
    if (patch.status === 'Cancelled' && booking.status !== 'Cancelled') {
      const movieTickets = await find('movie_tickets', { bookingId: booking.id, status: 'Confirmed' });
      await Promise.all(movieTickets.map((ticket) => update('movie_tickets', ticket.id, { status: 'Cancelled', cancelledAt: new Date().toISOString() })));
      const reservations = await find('facility_reservations', { bookingId: booking.id, status: 'Confirmed' });
      await Promise.all(reservations.map((reservation) => update('facility_reservations', reservation.id, { status: 'Cancelled', cancelledAt: new Date().toISOString() })));
      await notifyCustomers('booking_cancelled', `Your booking ${booking.bookingCode} at ${booking.hotelName} has been cancelled.`, { userId: booking.userId, bookingId: booking.id });
    }
    if (!isAdmin) {
      if (patch.status === 'Cancelled' && booking.status !== 'Cancelled') {
        await notifyAdmin(
          'booking_cancelled',
          `${booking.guest?.fullName || 'A customer'} cancelled booking ${booking.bookingCode} at ${booking.hotelName}.`,
          { bookingId: booking.id, bookingCode: booking.bookingCode },
        );
      }
      if (patch.guest && JSON.stringify(patch.guest) !== JSON.stringify(booking.guest)) {
        await notifyAdmin(
          'booking_updated',
          `${booking.guest?.fullName || 'A customer'} updated guest details for booking ${booking.bookingCode} at ${booking.hotelName}.`,
          { bookingId: booking.id, bookingCode: booking.bookingCode },
        );
      }
    }
    return res.json({ booking: updatedBooking });
  }
  if (req.method === 'DELETE') {
    if (!isAdmin && !['Cancelled', 'Completed'].includes(booking.status)) throw new HttpError(409, 'Cancel this booking first, then you can delete it from your list.');
    await remove('bookings', booking.id);
    if (!isAdmin) {
      await notifyAdmin(
        'booking_deleted',
        `${booking.guest?.fullName || 'A customer'} removed booking ${booking.bookingCode} at ${booking.hotelName} from their account.`,
        { bookingId: booking.id, bookingCode: booking.bookingCode },
      );
    }
    return res.json({ ok: true });
  }
  return methodNotAllowed(res, 'GET, PUT, DELETE');
});
