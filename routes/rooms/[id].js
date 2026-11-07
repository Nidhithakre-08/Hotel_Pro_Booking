import { handler, methodNotAllowed, requireAdmin, str, HttpError } from '../../lib/http.js';
import { find, findOne, update, remove } from '../../lib/store.js';
import { notifyCustomers } from '../../lib/customer-updates.js';

const STATUSES = ['Available', 'Maintenance', 'Hidden'];
export function cleanRoom(b, partial = false) {
  const d = {};
  const has = (k) => b[k] !== undefined;
  if (!partial || has('hotelId')) { if (!str(b.hotelId, 60)) return { error: 'Select a hotel.' }; d.hotelId = str(b.hotelId, 60); }
  if (!partial || has('name')) { if (!str(b.name, 120)) return { error: 'Room name is required.' }; d.name = str(b.name, 120); }
  if (!partial || has('type')) { if (!str(b.type, 60)) return { error: 'Room type is required.' }; d.type = str(b.type, 60); }
  if (!partial || has('price')) { const p = Number(b.price); if (!(p > 0)) return { error: 'Enter a valid price per night.' }; d.price = Math.round(p); }
  if (!partial || has('capacity')) { const c = Number(b.capacity); if (!(c >= 1 && c <= 20)) return { error: 'Capacity must be between 1 and 20.' }; d.capacity = Math.round(c); }
  if (!partial || has('beds')) d.beds = str(b.beds, 80);
  if (!partial || has('size')) d.size = str(b.size, 40);
  if (!partial || has('description')) d.description = str(b.description, 1500);
  if (!partial || has('image')) d.image = String(b.image || '').slice(0, 2_000_000);
  if (!partial || has('tag')) d.tag = str(b.tag, 30).toUpperCase();
  if (!partial || has('amenities')) d.amenities = (Array.isArray(b.amenities) ? b.amenities : String(b.amenities || '').split(',')).map((a) => str(a, 40)).filter(Boolean).slice(0, 20);
  if (has('status')) d.status = STATUSES.includes(b.status) ? b.status : 'Available'; else if (!partial) d.status = 'Available';
  return { data: d };
}

export default handler(async (req, res) => {
  const id = req.query.id;
  const room = await findOne('rooms', { id });
  if (!room) throw new HttpError(404, 'Room not found.');
  if (req.method === 'GET') return res.json({ room });
  if (req.method === 'PUT') {
    requireAdmin(req);
    const { data, error } = cleanRoom(req.body || {}, true);
    if (error) return res.status(400).json({ message: error });
    if (data.hotelId && !(await findOne('hotels', { id: data.hotelId }))) return res.status(400).json({ message: 'Choose a valid hotel.' });
    const updatedRoom = await update('rooms', id, data);
    const hotel = await findOne('hotels', { id: updatedRoom.hotelId });
    await notifyCustomers('room', `${updatedRoom.name} at ${hotel.name} has been updated.`, { hotelId: hotel.id, roomId: updatedRoom.id });
    return res.json({ room: updatedRoom });
  }
  if (req.method === 'DELETE') {
    requireAdmin(req);
    const active = (await find('bookings', { roomId: id })).filter((b) => ['Confirmed', 'Checked-in'].includes(b.status));
    if (active.length) return res.status(409).json({ message: `This room has ${active.length} active booking(s). Cancel them first, or set the room to Maintenance.` });
    await remove('rooms', id);
    return res.json({ ok: true });
  }
  return methodNotAllowed(res, 'GET, PUT, DELETE');
});
