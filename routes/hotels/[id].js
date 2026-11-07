import { handler, methodNotAllowed, requireAdmin, str, HttpError } from '../../lib/http.js';
import { find, findOne, update, remove, removeWhere } from '../../lib/store.js';
import { notifyCustomers } from '../../lib/customer-updates.js';

export function cleanHotel(b, partial = false) {
  const data = {};
  const set = (k, v) => { if (v !== undefined) data[k] = v; };
  if (!partial || b.name !== undefined) { if (!str(b.name, 120)) return { error: 'Hotel name is required.' }; set('name', str(b.name, 120)); }
  if (!partial || b.city !== undefined) { if (!str(b.city, 80)) return { error: 'City is required.' }; set('city', str(b.city, 80)); }
  set('country', b.country !== undefined ? str(b.country, 80) : (partial ? undefined : 'India'));
  set('address', b.address !== undefined ? str(b.address, 300) : (partial ? undefined : ''));
  set('description', b.description !== undefined ? str(b.description, 1500) : (partial ? undefined : ''));
  set('image', b.image !== undefined ? String(b.image).slice(0, 2_000_000) : (partial ? undefined : ''));
  if (b.stars !== undefined || !partial) set('stars', Math.min(5, Math.max(1, Number(b.stars) || 4)));
  if (b.amenities !== undefined || !partial) set('amenities', (Array.isArray(b.amenities) ? b.amenities : String(b.amenities || '').split(',')).map((a) => str(a, 40)).filter(Boolean).slice(0, 20));
  if (b.status !== undefined) set('status', ['Active', 'Inactive'].includes(b.status) ? b.status : 'Active'); else if (!partial) set('status', 'Active');
  return { data };
}

export default handler(async (req, res) => {
  const id = req.query.id;
  const hotel = await findOne('hotels', { id });
  if (!hotel) throw new HttpError(404, 'Hotel not found.');
  if (req.method === 'GET') return res.json({ hotel, rooms: (await find('rooms', { hotelId: id })).filter((r) => r.status !== 'Hidden') });
  if (req.method === 'PUT') {
    requireAdmin(req);
    const { data, error } = cleanHotel(req.body || {}, true);
    if (error) return res.status(400).json({ message: error });
    const updatedHotel = await update('hotels', id, data);
    await notifyCustomers('hotel', `${updatedHotel.name} has been updated.`, { hotelId: updatedHotel.id });
    return res.json({ hotel: updatedHotel });
  }
  if (req.method === 'DELETE') {
    requireAdmin(req);
    const upcoming = (await find('bookings', { hotelId: id })).filter((b) => ['Confirmed', 'Checked-in'].includes(b.status));
    if (upcoming.length) return res.status(409).json({ message: `This hotel has ${upcoming.length} active booking(s). Cancel or complete them before deleting.` });
    await removeWhere('rooms', { hotelId: id });
    await remove('hotels', id);
    return res.json({ ok: true });
  }
  return methodNotAllowed(res, 'GET, PUT, DELETE');
});
