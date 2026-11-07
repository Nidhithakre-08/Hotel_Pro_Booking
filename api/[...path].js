// ONE serverless function for the whole API (Vercel's free plan allows max 12 functions).
// Every /api/... request is routed here, then handed to the matching handler in /routes.
import authLogin from '../routes/auth/login.js';
import authRegister from '../routes/auth/register.js';
import authAdmin from '../routes/auth/admin-login.js';
import authMe from '../routes/auth/me.js';
import hotels from '../routes/hotels/index.js';
import hotelById from '../routes/hotels/[id].js';
import rooms from '../routes/rooms/index.js';
import roomById from '../routes/rooms/[id].js';
import bookings from '../routes/bookings/index.js';
import bookingById from '../routes/bookings/[id].js';
import adminStats from '../routes/admin/stats.js';
import adminUsers from '../routes/admin/users.js';
import adminNotifications from '../routes/admin/notifications.js';
import tickets from '../routes/tickets.js';
import updates from '../routes/updates.js';
import movies, { movieTicketById } from '../routes/movies.js';
import facilityBookings, { facilityReservationById } from '../routes/facility-bookings.js';
import health from '../routes/health.js';

const STATIC = { health, 'auth/login': authLogin, 'auth/register': authRegister, 'auth/admin-login': authAdmin, 'auth/me': authMe, hotels, rooms, bookings, movies, tickets, updates, 'facilities/bookings': facilityBookings, 'admin/stats': adminStats, 'admin/users': adminUsers, 'admin/notifications': adminNotifications };
const BY_ID = { hotels: hotelById, rooms: roomById, bookings: bookingById, movies: movieTicketById, 'facilities/bookings': facilityReservationById, 'admin/users': adminUsers };

export default async function api(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  let fn = STATIC[path]; let id;
  if (!fn) {
    const i = path.lastIndexOf('/');
    if (i > 0 && BY_ID[path.slice(0, i)]) { fn = BY_ID[path.slice(0, i)]; id = decodeURIComponent(path.slice(i + 1)); }
  }
  if (!fn) return res.status(404).json({ message: 'Not found' });
  if (id) {
    const query = { ...(req.query || {}), id };
    try { Object.defineProperty(req, 'query', { value: query, configurable: true, writable: true }); } catch { req.query = query; }
  }
  return fn(req, res);
}
