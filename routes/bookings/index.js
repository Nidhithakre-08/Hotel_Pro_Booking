import { handler, methodNotAllowed, getAuth, requireUser, str, HttpError } from '../../lib/http.js';
import { find, findOne, insert, newId } from '../../lib/store.js';
import { validateGuest, validateDates, buildPayment, overlaps, TAX_RATE } from '../../lib/booking.js';
import { notifyAdmin } from '../../lib/admin-notifications.js';
import { notifyCustomers } from '../../lib/customer-updates.js';
import { MOVIE_TICKET_PRICE } from '../../lib/movie-pricing.js';
export default handler(async (req, res) => {
  const auth = getAuth(req);
  if (req.method === 'GET') {
    if (!auth) throw new HttpError(401, 'Please sign in to view bookings.');
    const q = auth.role === 'admin' ? {} : { userId: auth.sub };
    const [bookings, hotels] = await Promise.all([find('bookings', q), find('hotels')]);
    const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel]));
    return res.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        hotelHasCinema: (hotelById.get(booking.hotelId)?.amenities || []).some((amenity) => /cinema|movie/i.test(amenity)),
      })),
    });
  }
  if (req.method === 'POST') {
    const { sub } = requireUser(req);
    const b = req.body || {};
    const room = await findOne('rooms', { id: str(b.roomId, 60) });
    if (!room) throw new HttpError(404, 'Room not found.');
    if (room.status !== 'Available') throw new HttpError(409, 'This room is not available for booking right now.');
    const hotel = await findOne('hotels', { id: room.hotelId });
    if (!hotel || hotel.status === 'Inactive') throw new HttpError(409, 'This hotel is not accepting bookings.');
    if (b.includeMovieScreening !== undefined && typeof b.includeMovieScreening !== 'boolean') {
      throw new HttpError(400, 'Choose whether to add movie screening tickets.');
    }
    const hotelHasCinema = (hotel.amenities || []).some((amenity) => /cinema|movie/i.test(amenity));
    if (b.includeMovieScreening === true && !hotelHasCinema) {
      throw new HttpError(400, 'This hotel does not offer an in-house cinema.');
    }
    const nights = validateDates(b.checkIn, b.checkOut);
    const guests = Number(b.guests);
    if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'At least one guest is required.');
    if (guests > room.capacity) throw new HttpError(400, `This room sleeps up to ${room.capacity} guests.`);
    const clash = (await find('bookings', { roomId: room.id })).some((x) => ['Confirmed', 'Checked-in'].includes(x.status) && overlaps(b.checkIn, b.checkOut, x.checkIn, x.checkOut));
    if (clash) throw new HttpError(409, 'Sorry, this room was just booked for those dates. Please pick different dates.');
    const guest = validateGuest(b.guest || {});
    const subtotal = room.price * nights, taxes = Math.round(subtotal * TAX_RATE);
    const movieTicketsIncluded = b.includeMovieScreening === true ? guests : 0;
    const movieTicketsAmount = movieTicketsIncluded * MOVIE_TICKET_PRICE;
    const total = subtotal + taxes + movieTicketsAmount;
    const payment = buildPayment(b.payment, total);
    const booking = await insert('bookings', {
      bookingCode: 'HP' + newId().slice(0, 7), userId: sub,
      hotelId: hotel.id, hotelName: hotel.name, hotelCity: hotel.city,
      roomId: room.id, roomName: room.name, roomType: room.type, image: room.image,
      checkIn: b.checkIn, checkOut: b.checkOut, nights, guests,
      pricePerNight: room.price, subtotal, taxes, movieTicketsIncluded, movieTicketsAmount, amount: total,
      status: 'Confirmed', guest, payment,
    });
    await notifyCustomers('booking_confirmed', `Your booking ${booking.bookingCode} at ${hotel.name} is confirmed.`, { userId: sub, bookingId: booking.id });
    await notifyAdmin('booking', `${guest.fullName} booked ${room.name} at ${hotel.name}.`, { bookingId: booking.id });
    return res.status(201).json({ booking });
  }
  return methodNotAllowed(res, 'GET, POST');
});
