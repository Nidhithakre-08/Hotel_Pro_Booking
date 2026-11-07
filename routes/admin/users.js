import { handler, requireAdmin, methodNotAllowed, HttpError } from '../../lib/http.js';
import { find, remove, findOne } from '../../lib/store.js';
export default handler(async (req, res) => {
  requireAdmin(req);
  if (req.method === 'GET') {
    const [users, bookings] = await Promise.all([find('users'), find('bookings')]);
    return res.json({ users: users.map(({ passwordHash, ...u }) => ({ ...u, bookings: bookings.filter((b) => b.userId === u.id).length })) });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!(await findOne('users', { id }))) throw new HttpError(404, 'Customer not found.');
    if ((await find('bookings', { userId: id })).some((b) => ['Confirmed', 'Checked-in'].includes(b.status))) throw new HttpError(409, 'This customer has active bookings.');
    await remove('users', id);
    return res.json({ ok: true });
  }
  return methodNotAllowed(res, 'GET, DELETE');
});
