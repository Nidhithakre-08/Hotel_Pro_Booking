import { handler, methodNotAllowed } from '../lib/http.js';
import { storageMode } from '../lib/store.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  return res.status(200).json({ ok: true, storage: storageMode() });
});