import { handler, methodNotAllowed, requireAdmin, getAuth } from '../../lib/http.js';
import { find, findOne, insert } from '../../lib/store.js';
import { cleanRoom } from './[id].js';
import { notifyCustomers } from '../../lib/customer-updates.js';
export default handler(async (req, res) => {
  if (req.method === 'GET') {
    const q = {}; if (req.query.hotelId) q.hotelId = req.query.hotelId;
    const isAdmin = getAuth(req)?.role === 'admin';
    let rooms = await find('rooms', q);
    if (!isAdmin) {
      const activeHotelIds = new Set((await find('hotels')).filter((hotel) => hotel.status !== 'Inactive').map((hotel) => hotel.id));
      rooms = rooms.filter((room) => room.status === 'Available' && activeHotelIds.has(room.hotelId));
    }
    const active = (await find('bookings')).filter((b) => ['Confirmed', 'Checked-in'].includes(b.status));
    rooms = rooms.map((r) => ({ ...r, booked: active.filter((b) => b.roomId === r.id).map((b) => ({ checkIn: b.checkIn, checkOut: b.checkOut })) }));
    return res.json({ rooms });
  }
  if (req.method === 'POST') {
    requireAdmin(req);
    const { data, error } = cleanRoom(req.body || {});
    if (error) return res.status(400).json({ message: error });
    if (!(await findOne('hotels', { id: data.hotelId }))) return res.status(400).json({ message: 'Choose a valid hotel for this room.' });
    const room = await insert('rooms', { ...data, rating: 4.5, reviews: 0, tag: data.tag || 'NEW' });
    const hotel = await findOne('hotels', { id: room.hotelId });
    await notifyCustomers('room', `A new room, ${room.name}, is now available at ${hotel.name}.`, { hotelId: hotel.id, roomId: room.id });
    return res.status(201).json({ room });
  }
  return methodNotAllowed(res, 'GET, POST');
});
