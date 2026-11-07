import { handler, methodNotAllowed, getAuth, HttpError } from '../lib/http.js';
import { find, findOne, insert, update, newId } from '../lib/store.js';
import { notifyAdmin } from '../lib/admin-notifications.js';

const FACILITY_TYPES = {
  spa: { amenity: /spa|wellness/i, name: 'Spa treatment', capacity: 16, times: ['10:00', '12:00', '14:00', '16:00'], price: 1800 },
  dining: { amenity: /restaurant|dining/i, name: 'Restaurant table', capacity: 30, times: ['18:00', '19:30', '21:00'], price: 0 },
};

function isFutureSlot(date, time) {
  return new Date(`${date}T${time}:00+05:30`) > new Date();
}

async function getActiveBooking(id, auth) {
  const booking = await findOne('bookings', { id });
  if (!booking || booking.userId !== auth.sub) throw new HttpError(404, 'Hotel booking not found.');
  if (!['Confirmed', 'Checked-in'].includes(booking.status)) throw new HttpError(409, 'Facility reservations are available only for active hotel bookings.');
  return booking;
}

async function validateHotelFacility(booking, type) {
  const facility = FACILITY_TYPES[type];
  if (!facility) throw new HttpError(400, 'Choose spa or dining.');
  const hotel = await findOne('hotels', { id: booking.hotelId });
  if (!hotel || !(hotel.amenities || []).some((amenity) => facility.amenity.test(amenity))) {
    throw new HttpError(409, `This hotel does not offer ${type === 'spa' ? 'spa treatments' : 'restaurant dining'}.`);
  }
  return facility;
}

export default handler(async (req, res) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'guest') throw new HttpError(401, 'Please sign in as a customer.');

  if (req.method === 'GET') {
    const bookingId = req.query.bookingId;
    if (typeof bookingId !== 'string' || !bookingId) throw new HttpError(400, 'A hotel booking ID is required.');
    await getActiveBooking(bookingId, auth);
    const reservations = await find('facility_reservations', { bookingId });
    return res.json({ reservations });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (typeof body.bookingId !== 'string' || !body.bookingId) throw new HttpError(400, 'A hotel booking ID is required.');
    const booking = await getActiveBooking(body.bookingId, auth);
    const facility = await validateHotelFacility(booking, body.type);
    const date = typeof body.date === 'string' ? body.date : '';
    const time = typeof body.time === 'string' ? body.time : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || date < booking.checkIn || date >= booking.checkOut) {
      throw new HttpError(400, 'Choose a date during your hotel stay.');
    }
    if (!facility.times.includes(time)) throw new HttpError(400, 'Choose an available appointment time.');
    if (!isFutureSlot(date, time)) throw new HttpError(409, 'This appointment time has already passed.');
    const guests = Number(body.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > booking.guests) {
      throw new HttpError(400, `Choose between 1 and ${booking.guests} guest${booking.guests === 1 ? '' : 's'}.`);
    }
    const sameSlot = await find('facility_reservations', {
      hotelId: booking.hotelId,
      type: body.type,
      date,
      time,
      status: 'Confirmed',
    });
    const reserved = sameSlot.reduce((total, item) => total + item.guests, 0);
    if (reserved + guests > facility.capacity) throw new HttpError(409, 'This time is fully booked. Please choose another time.');

    const reservation = await insert('facility_reservations', {
      reservationCode: `FR${newId().slice(0, 7)}`,
      userId: auth.sub,
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      hotelId: booking.hotelId,
      hotelName: booking.hotelName,
      type: body.type,
      facilityName: facility.name,
      date,
      time,
      guests,
      amount: guests * facility.price,
      paymentStatus: facility.price ? 'Pay at hotel' : 'No prepayment',
      status: 'Confirmed',
    });
    await notifyAdmin('facility_reservation', `${booking.guest?.fullName || 'A customer'} reserved ${facility.name.toLowerCase()} for ${guests} at ${booking.hotelName} on ${date} at ${time}.`, {
      bookingId: booking.id,
      reservationId: reservation.id,
    });
    return res.status(201).json({ reservation });
  }

  return methodNotAllowed(res, 'GET, POST');
});

export const facilityReservationById = handler(async (req, res) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'guest') throw new HttpError(401, 'Please sign in as a customer.');
  if (req.method !== 'PUT') return methodNotAllowed(res, 'PUT');
  const reservation = await findOne('facility_reservations', { id: req.query.id });
  if (!reservation || reservation.userId !== auth.sub) throw new HttpError(404, 'Facility reservation not found.');
  if (reservation.status !== 'Confirmed') throw new HttpError(409, 'This reservation is no longer active.');
  if (req.body?.status !== 'Cancelled') throw new HttpError(400, 'A facility reservation can only be cancelled.');
  return res.json({ reservation: await update('facility_reservations', reservation.id, { status: 'Cancelled', cancelledAt: new Date().toISOString() }) });
});
