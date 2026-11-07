import { handler, methodNotAllowed, getAuth, requireUser, HttpError } from '../lib/http.js';
import { find, findOne, insert, update, newId } from '../lib/store.js';
import { notifyAdmin } from '../lib/admin-notifications.js';
import { MOVIE_TICKET_PRICE } from '../lib/movie-pricing.js';

const SCREENING_CAPACITY = 30;
const MOVIES = [
  { id: 'family-feature', title: 'Family Movie Night', genre: 'Family', duration: 105 },
  { id: 'adventure-feature', title: 'Adventure Under the Stars', genre: 'Adventure', duration: 115 },
  { id: 'cinema-classics', title: 'Cinema Classics', genre: 'Drama', duration: 120 },
];

function getScreenings(booking) {
  const start = new Date(`${booking.checkIn}T12:00:00Z`);
  const end = new Date(`${booking.checkOut}T12:00:00Z`);
  const screenings = [];
  for (let day = new Date(start), index = 0; day < end; day.setUTCDate(day.getUTCDate() + 1), index += 1) {
    const date = day.toISOString().slice(0, 10);
    for (const [time, offset] of [['18:00', 0], ['20:30', 1]]) {
      const movie = MOVIES[(index + offset) % MOVIES.length];
      screenings.push({
        id: `${booking.hotelId}-${date}-${time.replace(':', '')}-${movie.id}`,
        movieId: movie.id,
        title: movie.title,
        genre: movie.genre,
        duration: movie.duration,
        date,
        time,
        price: MOVIE_TICKET_PRICE,
        capacity: SCREENING_CAPACITY,
      });
    }
  }
  return screenings.filter((screening) => new Date(`${screening.date}T${screening.time}:00+05:30`) > new Date());
}

async function getBookingForUser(id, auth) {
  const booking = await findOne('bookings', { id });
  if (!booking || (auth.role !== 'admin' && booking.userId !== auth.sub)) throw new HttpError(404, 'Hotel booking not found.');
  if (!['Confirmed', 'Checked-in'].includes(booking.status)) throw new HttpError(409, 'Movie tickets are available only for active hotel bookings.');
  const hotel = await findOne('hotels', { id: booking.hotelId });
  if (!hotel || !(hotel.amenities || []).some((amenity) => /cinema|movie/i.test(amenity))) {
    throw new HttpError(409, 'This hotel does not offer an in-house cinema.');
  }
  return booking;
}

export default handler(async (req, res) => {
  const auth = getAuth(req);
  if (!auth) throw new HttpError(401, 'Please sign in.');

  if (req.method === 'GET') {
    const bookingId = req.query.bookingId;
    if (typeof bookingId !== 'string' || !bookingId) throw new HttpError(400, 'A hotel booking ID is required.');
    const booking = await getBookingForUser(bookingId, auth);
    const screenings = getScreenings(booking);
    const reservations = await find('movie_tickets', { bookingId: booking.id });
    const reservedByScreening = new Map();
    for (const ticket of reservations) {
      if (ticket.status === 'Confirmed') reservedByScreening.set(ticket.screeningId, (reservedByScreening.get(ticket.screeningId) || 0) + ticket.quantity);
    }
    return res.json({
      screenings: screenings.map((screening) => ({
        ...screening,
        remaining: Math.max(0, screening.capacity - (reservedByScreening.get(screening.id) || 0)),
      })),
      tickets: reservations,
    });
  }

  if (req.method === 'POST') {
    const { sub } = requireUser(req);
    const body = req.body || {};
    if (typeof body.bookingId !== 'string' || !body.bookingId) throw new HttpError(400, 'A hotel booking ID is required.');
    const booking = await getBookingForUser(body.bookingId, auth);
    const screeningId = typeof body.screeningId === 'string' ? body.screeningId : '';
    const screening = getScreenings(booking).find((item) => item.id === screeningId);
    if (!screening) throw new HttpError(400, 'Choose a movie screening during your hotel stay.');
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > booking.guests) {
      throw new HttpError(400, `Choose between 1 and ${booking.guests} tickets for this booking.`);
    }
    const included = Number(booking.movieTicketsIncluded) || 0;
    let paymentStatus = 'Pay at cinema';
    if (included > 0) {
      const confirmedTickets = await find('movie_tickets', { bookingId: booking.id, status: 'Confirmed' });
      const usedIncludedTickets = confirmedTickets
        .filter((ticket) => ticket.paymentStatus === 'Paid with hotel booking')
        .reduce((total, ticket) => total + ticket.quantity, 0);
      if (quantity > included - usedIncludedTickets) {
        throw new HttpError(400, `Only ${Math.max(0, included - usedIncludedTickets)} prepaid movie ticket${included - usedIncludedTickets === 1 ? '' : 's'} remain for this booking.`);
      }
      paymentStatus = 'Paid with hotel booking';
    }
    if (new Date(`${screening.date}T${screening.time}:00+05:30`) <= new Date()) throw new HttpError(409, 'This movie screening has already passed.');
    const existing = await find('movie_tickets', { screeningId, status: 'Confirmed' });
    const reserved = existing.reduce((total, ticket) => total + ticket.quantity, 0);
    if (reserved + quantity > screening.capacity) throw new HttpError(409, 'This screening does not have enough seats remaining.');

    const ticket = await insert('movie_tickets', {
      ticketCode: `MT${newId().slice(0, 7)}`,
      userId: sub,
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      hotelId: booking.hotelId,
      hotelName: booking.hotelName,
      screeningId,
      movieId: screening.movieId,
      title: screening.title,
      date: screening.date,
      time: screening.time,
      quantity,
      amount: quantity * screening.price,
      paymentStatus,
      status: 'Confirmed',
    });
    await notifyAdmin('movie_ticket', `${booking.guest?.fullName || 'A customer'} reserved ${quantity} movie ticket${quantity === 1 ? '' : 's'} for ${screening.title} at ${booking.hotelName}.`, {
      bookingId: booking.id,
      ticketId: ticket.id,
    });
    return res.status(201).json({ ticket });
  }

  return methodNotAllowed(res, 'GET, POST');
});

export const movieTicketById = handler(async (req, res) => {
  const auth = getAuth(req);
  if (!auth) throw new HttpError(401, 'Please sign in.');
  if (req.method !== 'PUT') return methodNotAllowed(res, 'PUT');
  const ticket = await findOne('movie_tickets', { id: req.query.id });
  if (!ticket || (auth.role !== 'admin' && ticket.userId !== auth.sub)) throw new HttpError(404, 'Movie ticket reservation not found.');
  if (ticket.status !== 'Confirmed') throw new HttpError(409, 'This movie ticket reservation is no longer active.');
  if (req.body?.status !== 'Cancelled') throw new HttpError(400, 'A movie ticket reservation can only be cancelled.');
  const cancelled = await update('movie_tickets', ticket.id, { status: 'Cancelled', cancelledAt: new Date().toISOString() });
  if (auth.role !== 'admin') {
    await notifyAdmin('movie_ticket', `${ticket.ticketCode} for ${ticket.title} at ${ticket.hotelName} was cancelled by the customer.`, {
      bookingId: ticket.bookingId,
      ticketId: ticket.id,
    });
  }
  return res.json({ ticket: cancelled });
});
