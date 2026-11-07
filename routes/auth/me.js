import { handler, getAuth, adminCredentials } from '../../lib/http.js';
import { findOne } from '../../lib/store.js';
import { publicUser } from '../../lib/http.js';
export default handler(async (req, res) => {
  const a = getAuth(req);
  if (!a) return res.status(401).json({ message: 'Not signed in.' });
  if (a.role === 'admin') return res.json({ admin: { name: 'Administrator', email: adminCredentials().email, role: 'admin' } });
  const u = await findOne('users', { id: a.sub });
  if (!u) return res.status(401).json({ message: 'Account not found.' });
  return res.json({ user: publicUser(u) });
});
