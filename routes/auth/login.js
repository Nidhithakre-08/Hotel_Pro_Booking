import bcrypt from 'bcryptjs';
import { handler, methodNotAllowed, signToken, str, emailOk, publicUser } from '../../lib/http.js';
import { findOne } from '../../lib/store.js';
import { notifyAdmin } from '../../lib/admin-notifications.js';
export default handler(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  const { email, password } = req.body || {};
  const e = str(email, 200).toLowerCase();
  if (!emailOk(e) || typeof password !== 'string' || !password) return res.status(400).json({ message: 'Enter a valid email and password.' });
  const user = await findOne('users', { email: e });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
  await notifyAdmin('login', `${user.name} signed in.`);
  return res.status(200).json({ token: signToken({ sub: user.id, role: 'guest' }), user: publicUser(user) });
});
