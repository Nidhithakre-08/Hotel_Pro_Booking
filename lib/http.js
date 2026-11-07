import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { init } from './store.js';

const DEV_SECRET = 'hotelpro-dev-secret-change-me-before-deploying-1234567890';
function secret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 32 && !s.startsWith('replace-with')) return s;
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET (32+ chars) is required in production.');
  return DEV_SECRET;
}
export const signToken = (payload) => jwt.sign(payload, secret(), { expiresIn: '7d' });

export function adminCredentials() {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const production = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const validEmail = configuredEmail && !configuredEmail.includes('example.com');
  const validPassword = configuredPassword && !configuredPassword.startsWith('replace-with') && configuredPassword.length >= 12;
  if (production && (!validEmail || !validPassword)) {
    throw new Error('ADMIN_EMAIL and a strong ADMIN_PASSWORD (at least 12 characters) are required in production.');
  }
  const email = (validEmail ? configuredEmail : 'admin@hotelpro.com').toLowerCase();
  const pw = validPassword ? configuredPassword : 'Admin@12345';
  return { email, password: pw };
}
export function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export function getAuth(req) {
  const h = req.headers?.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), secret()); } catch { return null; }
}
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function requireUser(req) {
  const a = getAuth(req);
  if (!a || a.role !== 'guest') throw new HttpError(401, 'Please sign in to continue.');
  return a;
}
export function requireAdmin(req) {
  const a = getAuth(req);
  if (!a || a.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  return a;
}

export function handler(fn, { initializeStore = true } = {}) {
  return async (req, res) => {
    try {
      if (initializeStore) await init();
      if (typeof req.body === 'string') { try { req.body = JSON.parse(req.body); } catch { req.body = {}; } }
      await fn(req, res);
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ message: e.message });
      console.error('API error:', e);
      const setupErrors = [
        'JWT_SECRET (32+ chars) is required in production.',
        'ADMIN_EMAIL and a strong ADMIN_PASSWORD (at least 12 characters) are required in production.',
        'MONGODB_URI must be configured with a valid MongoDB connection string on Vercel.',
        'MONGODB_URI is malformed. Copy the Atlas connection string and URL-encode special characters in its username or password.',
        'MongoDB authentication failed. Check the database username and password in MONGODB_URI.',
        'Could not connect to MongoDB on Vercel. Check MONGODB_URI and Atlas network access.',
      ];
      const safeSetupError = setupErrors.find((message) => e.message === message);
      return res.status(500).json({
        message: safeSetupError || 'Server error. Please try again.',
        detail: process.env.NODE_ENV === 'development' ? e.message : undefined,
      });
    }
  };
}
export const methodNotAllowed = (res, allow) => { res.setHeader('Allow', allow); return res.status(405).json({ message: 'Method not allowed' }); };
export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', role: 'guest', createdAt: u.createdAt });
