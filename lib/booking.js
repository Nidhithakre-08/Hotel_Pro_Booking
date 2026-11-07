import { str, emailOk, nightsBetween, HttpError } from './http.js';
export const TAX_RATE = 0.12;
export const PAY_METHODS = ['card', 'upi', 'netbanking', 'hotel'];
export const BOOKING_STATUSES = ['Confirmed', 'Checked-in', 'Completed', 'Cancelled'];
export const PAYMENT_STATUSES = ['Paid', 'Pending', 'Refunded'];
const dateOk = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const overlaps = (aIn, aOut, bIn, bOut) => aIn < bOut && bIn < aOut;

export function validateGuest(b) {
  const g = {
    fullName: str(b.fullName, 120), email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 20),
    address: str(b.address, 300), city: str(b.city, 80), idType: str(b.idType, 30), idNumber: str(b.idNumber, 40),
    arrivalTime: str(b.arrivalTime, 20), specialRequests: str(b.specialRequests, 600),
  };
  if (g.fullName.length < 2) throw new HttpError(400, 'Enter the guest’s full name.');
  if (!emailOk(g.email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!/^[+\d][\d\s-]{7,17}$/.test(g.phone)) throw new HttpError(400, 'Enter a valid phone number.');
  if (!g.idType || g.idNumber.length < 4) throw new HttpError(400, 'Enter a valid ID proof type and number.');
  return g;
}

export function validateDates(checkIn, checkOut) {
  if (!dateOk(checkIn) || !dateOk(checkOut)) throw new HttpError(400, 'Choose valid check-in and check-out dates.');
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn < today) throw new HttpError(400, 'Check-in date cannot be in the past.');
  const n = nightsBetween(checkIn, checkOut);
  if (n < 1) throw new HttpError(400, 'Check-out must be after check-in.');
  if (n > 30) throw new HttpError(400, 'You can book up to 30 nights at a time.');
  return n;
}

// Payment details are validated here but sensitive data is never stored: only brand + last 4 digits.
export function buildPayment(p, total) {
  const method = p?.method;
  if (!PAY_METHODS.includes(method)) throw new HttpError(400, 'Choose a payment method.');
  const base = { method, amount: total };
  if (method === 'card') {
    const last4 = String(p.cardLast4 || '').replace(/\D/g, '');
    if (last4.length !== 4 || !str(p.cardHolder, 80)) throw new HttpError(400, 'Enter valid card details.');
    return { ...base, status: 'Paid', cardBrand: str(p.cardBrand, 20) || 'Card', cardLast4: last4, cardHolder: str(p.cardHolder, 80), transactionId: 'TXN' + Date.now().toString(36).toUpperCase(), paidAt: new Date().toISOString() };
  }
  if (method === 'upi') {
    const upi = str(p.upiId, 80);
    if (!/^[\w.\-]{2,}@[\w]{2,}$/.test(upi)) throw new HttpError(400, 'Enter a valid UPI ID (for example name@okbank).');
    return { ...base, status: 'Paid', upiId: upi, transactionId: 'UPI' + Date.now().toString(36).toUpperCase(), paidAt: new Date().toISOString() };
  }
  if (method === 'netbanking') {
    const bank = str(p.bank, 60);
    if (!bank) throw new HttpError(400, 'Select your bank.');
    return { ...base, status: 'Paid', bank, transactionId: 'NB' + Date.now().toString(36).toUpperCase(), paidAt: new Date().toISOString() };
  }
  return { ...base, status: 'Pending' }; // pay at hotel
}
