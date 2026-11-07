import { handler, methodNotAllowed, requireAdmin, str } from '../../lib/http.js';
import { find, insert } from '../../lib/store.js';
import { cleanHotel } from './[id].js';
import { notifyCustomers } from '../../lib/customer-updates.js';
export default handler(async (req, res) => {
  if (req.method === 'GET') {
    const hotels = await find('hotels');
    const rooms = await find('rooms');
    let isAdmin = false; try { requireAdmin(req); isAdmin = true; } catch {}
    const out = hotels.map((h) => {
      const rs = rooms.filter((r) => r.hotelId === h.id && (isAdmin ? r.status !== 'Hidden' : r.status === 'Available'));
      return { ...h, roomCount: rs.length, fromPrice: rs.length ? Math.min(...rs.map((r) => r.price)) : null };
    });
    return res.json({ hotels: isAdmin ? out : out.filter((h) => h.status !== 'Inactive') });
  }
  if (req.method === 'POST') {
    requireAdmin(req);
    const { data, error } = cleanHotel(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const hotel = await insert('hotels', { ...data, rating: 4.5, reviews: 0 });
    await notifyCustomers('hotel', `A new hotel, ${hotel.name}, has been added to HotelPro.`, { hotelId: hotel.id });
    return res.status(201).json({ hotel });
  }
  return methodNotAllowed(res, 'GET, POST');
});
