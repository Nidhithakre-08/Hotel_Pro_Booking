import bcrypt from 'bcryptjs';
import { handler, methodNotAllowed, signToken, str, emailOk, publicUser, adminCredentials } from '../../lib/http.js';
import { findOne, insert } from '../../lib/store.js';
export default handler(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  const { name, email, password, phone } = req.body || {};
  const n = str(name, 120), e = str(email, 200).toLowerCase();
  if (!n || !emailOk(e) || typeof password !== 'string' || password.length < 8 || password.length > 128)
    return res.status(400).json({ message: 'Enter your name, a valid email and a password of at least 8 characters.' });
  if (e === adminCredentials().email) return res.status(409).json({ message: 'This email is reserved. Please use a different email.' });
  if (await findOne('users', { email: e })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await insert('users', { name: n, email: e, phone: str(phone, 20), passwordHash: await bcrypt.hash(password, 10), role: 'guest' });
  return res.status(201).json({ token: signToken({ sub: user.id, role: 'guest' }), user: publicUser(user) });
});
