// Customer support tickets (created from the chatbot or any form).
//   GET  /api/tickets            -> signed-in customer: own tickets | admin: all tickets
//   POST /api/tickets            -> create a ticket (works for guests too: name + phone/email required)
//   PUT  /api/tickets?id=TICKET  -> admin: change status / reply | customer: add a message to own ticket
// Kept as ONE file so it counts as a single Vercel serverless function.
import { handler, methodNotAllowed, getAuth, str, emailOk, HttpError } from '../lib/http.js';
import { find, findOne, insert, update, newId } from '../lib/store.js';
import { notifyAdmin } from '../lib/admin-notifications.js';

const STATUSES = ['Open', 'In progress', 'Resolved', 'Closed'];
const SLOTS = ['10:00 AM – 12:00 PM', '12:00 PM – 2:00 PM', '2:00 PM – 4:00 PM', '4:00 PM – 6:00 PM'];
const CATEGORIES = ['Booking', 'Payment & refund', 'Cancellation', 'Room / stay issue', 'Account', 'Complaint', 'Call appointment', 'Other'];
const PRIORITIES = ['Normal', 'High'];

const cleanTranscript = (t) => (Array.isArray(t) ? t.slice(-14).map((m) => ({ from: m?.from === 'user' ? 'user' : 'bot', text: str(m?.text, 400) })).filter((m) => m.text) : []);

export default handler(async (req, res) => {
  const auth = getAuth(req);
  const isAdmin = auth?.role === 'admin';

  if (req.method === 'GET') {
    if (!auth) throw new HttpError(401, 'Please sign in to view your tickets.');
    const rows = await find('tickets', isAdmin ? {} : { userId: auth.sub });
    return res.json({ tickets: rows });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const user = auth?.role === 'guest' ? await findOne('users', { id: auth.sub }) : null;
    const name = str(b.name, 120) || user?.name || '';
    const email = (str(b.email, 200) || user?.email || '').toLowerCase();
    const phone = str(b.phone, 20) || user?.phone || '';
    const message = str(b.message, 1500) || (b.appointment ? 'Call appointment request' : '');
    if (name.length < 2) throw new HttpError(400, 'Please tell us your name.');
    if (!phone && !emailOk(email)) throw new HttpError(400, 'Please share a phone number or a valid email so our team can reach you.');
    if (email && !emailOk(email)) throw new HttpError(400, 'Enter a valid email address.');
    if (message.length < 5) throw new HttpError(400, 'Please describe the problem in a few words.');
    let category = CATEGORIES.includes(b.category) ? b.category : 'Other';
    let appointment = null;
    if (b.appointment) {
      const date = str(b.appointment.date, 10), slot = str(b.appointment.slot, 40);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'Choose a valid appointment date (today or later).');
      if (!SLOTS.includes(slot)) throw new HttpError(400, 'Choose a time slot.');
      if (!phone) throw new HttpError(400, 'A phone number is needed so we can call you.');
      category = 'Call appointment'; appointment = { date, slot };
    }
    const ticket = await insert('tickets', {
      ticketCode: 'TK' + newId().slice(0, 6),
      userId: user?.id || null, name, email, phone,
      category, appointment, subject: str(b.subject, 120) || (appointment ? `Call on ${appointment.date}, ${appointment.slot}` : `${category} request`), message,
      bookingCode: str(b.bookingCode, 20).toUpperCase(),
      priority: PRIORITIES.includes(b.priority) ? b.priority : 'Normal',
      escalated: !!b.escalated, source: 'chatbot', status: 'Open',
      transcript: cleanTranscript(b.transcript), replies: [],
    });
    await notifyAdmin(
      appointment ? 'appointment' : 'ticket',
      appointment
        ? `${name} booked a call appointment for ${appointment.date} (${appointment.slot}).`
        : `${name} submitted support ticket ${ticket.ticketCode}.`,
      { ticketId: ticket.id },
    );
    return res.status(201).json({ ticket });
  }

  if (req.method === 'PUT') {
    if (!auth) throw new HttpError(401, 'Please sign in.');
    const t = await findOne('tickets', { id: req.query.id });
    if (!t || (!isAdmin && t.userId !== auth.sub)) throw new HttpError(404, 'Ticket not found.');
    const b = req.body || {};
    const patch = {};
    if (isAdmin && b.status !== undefined) {
      if (!STATUSES.includes(b.status)) throw new HttpError(400, 'Invalid status.');
      patch.status = b.status;
    }
    const text = str(b.reply, 1000);
    if (text) {
      patch.replies = [...(t.replies || []), { from: isAdmin ? 'support' : 'customer', text, at: new Date().toISOString() }];
      if (isAdmin && t.status === 'Open' && !patch.status) patch.status = 'In progress';
    }
    if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update.');
    return res.json({ ticket: await update('tickets', t.id, patch) });
  }
  return methodNotAllowed(res, 'GET, POST, PUT');
});
