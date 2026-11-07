import { handler, methodNotAllowed, requireAdmin, HttpError } from '../../lib/http.js';
import { find, findOne, update } from '../../lib/store.js';

export default handler(async (req, res) => {
  requireAdmin(req);
  if (req.method === 'GET') {
    const notifications = (await find('notifications')).slice(0, 50);
    return res.json({ notifications });
  }
  if (req.method === 'PUT') {
    const body = req.body || {};
    if (body.all === true) {
      const unread = await find('notifications', { read: false });
      await Promise.all(unread.map((notification) => update('notifications', notification.id, { read: true })));
      return res.json({ ok: true });
    }
    if (typeof body.id !== 'string' || !body.id) throw new HttpError(400, 'A notification ID is required.');
    const notification = await findOne('notifications', { id: body.id });
    if (!notification) throw new HttpError(404, 'Notification not found.');
    return res.json({ notification: await update('notifications', notification.id, { read: true }) });
  }
  return methodNotAllowed(res, 'GET, PUT');
});
