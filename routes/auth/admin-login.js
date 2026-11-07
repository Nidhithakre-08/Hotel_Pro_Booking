import { handler, methodNotAllowed, signToken, str, adminCredentials, safeEqual } from '../../lib/http.js';
export default handler(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  const { email, password } = req.body || {};
  const creds = adminCredentials();
  const okEmail = safeEqual(str(email, 200).toLowerCase(), creds.email);
  const okPass = safeEqual(typeof password === 'string' ? password : '', creds.password);
  if (!(okEmail && okPass)) return res.status(401).json({ message: 'Invalid administrator credentials.' });
  return res.status(200).json({ token: signToken({ sub: 'admin', role: 'admin' }), admin: { name: 'Administrator', email: creds.email, role: 'admin' } });
}, { initializeStore: false });
