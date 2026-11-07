import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, CreditCard, Landmark, ShieldCheck, Smartphone, Star, Store, Users } from 'lucide-react';
import { Modal } from './components.jsx';
import { request } from './lib/api.js';
import { BANKS, ID_TYPES, TAX_RATE, addDays, cardBrand, fmtDate, luhn, money, nightsBetween, roomFreeFor, todayIso } from './lib/utils.js';
import { MOVIE_TICKET_PRICE } from '../lib/movie-pricing.js';

const METHODS = [
  { id: 'card', label: 'Credit / Debit card', icon: CreditCard },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'netbanking', label: 'Net banking', icon: Landmark },
  { id: 'hotel', label: 'Pay at hotel', icon: Store },
];
const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

function expiryOk(v) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false;
  const mm = +m[1], yy = 2000 + +m[2]; if (mm < 1 || mm > 12) return false;
  const now = new Date(); return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

export default function BookingFlow({ room, hotel, user, dates, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [checkIn, setCheckIn] = useState(dates.checkIn);
  const [checkOut, setCheckOut] = useState(dates.checkOut);
  const [guests, setGuests] = useState(Math.min(dates.guests, room.capacity));
  const [includeMovieScreening, setIncludeMovieScreening] = useState(false);
  const [g, setG] = useState({ fullName: user?.name || '', email: user?.email || '', phone: user?.phone || '', idType: ID_TYPES[0], idNumber: '', city: '', address: '', arrivalTime: '14:00', specialRequests: '' });
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [upi, setUpi] = useState('');
  const [bank, setBank] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = room.price * nights;
  const taxes = Math.round(subtotal * TAX_RATE);
  const movieTicketsIncluded = includeMovieScreening ? guests : 0;
  const movieTicketsAmount = movieTicketsIncluded * MOVIE_TICKET_PRICE;
  const total = subtotal + taxes + movieTicketsAmount;
  const hotelHasCinema = (hotel?.amenities || []).some((amenity) => /cinema|movie/i.test(amenity));
  const free = useMemo(() => nights > 0 && roomFreeFor(room, checkIn, checkOut), [room, checkIn, checkOut, nights]);
  const setField = (k) => (e) => setG((p) => ({ ...p, [k]: e.target.value }));

  function next1() {
    if (checkIn < todayIso()) return setError('Check-in cannot be in the past.');
    if (nights < 1) return setError('Check-out must be after check-in.');
    if (nights > 30) return setError('You can book up to 30 nights at a time.');
    if (!free) return setError('This room is already booked for those dates. Please choose different dates.');
    setError(''); setStep(2);
  }
  function next2() {
    if (g.fullName.trim().length < 2) return setError('Enter the guest’s full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) return setError('Enter a valid email address.');
    if (!/^[+\d][\d\s-]{7,17}$/.test(g.phone.trim())) return setError('Enter a valid phone number.');
    if (g.idNumber.trim().length < 4) return setError('Enter your ID proof number.');
    setError(''); setStep(3);
  }
  function paymentPayload() {
    if (method === 'card') {
      const digits = card.number.replace(/\D/g, '');
      if (!luhn(card.number)) throw new Error('Enter a valid card number.');
      if (card.name.trim().length < 2) throw new Error('Enter the name on the card.');
      if (!expiryOk(card.exp)) throw new Error('Enter a valid expiry date (MM/YY).');
      if (!/^\d{3,4}$/.test(card.cvv)) throw new Error('Enter a valid CVV.');
      return { method, cardLast4: digits.slice(-4), cardBrand: cardBrand(card.number), cardHolder: card.name.trim() }; // full number & CVV never leave this form
    }
    if (method === 'upi') { if (!/^[\w.\-]{2,}@[\w]{2,}$/.test(upi.trim())) throw new Error('Enter a valid UPI ID (for example name@okbank).'); return { method, upiId: upi.trim() }; }
    if (method === 'netbanking') { if (!bank) throw new Error('Select your bank.'); return { method, bank }; }
    return { method };
  }
  async function confirm() {
    setError('');
    let payment;
    try { payment = paymentPayload(); } catch (e) { return setError(e.message); }
    setBusy(true);
    try {
      const { booking } = await request('/bookings', { method: 'POST', body: JSON.stringify({ roomId: room.id, checkIn, checkOut, guests, guest: g, payment, includeMovieScreening }) });
      setDone(booking); onDone(booking);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <Modal title="Booking confirmed!" kicker="THANK YOU" onClose={onClose}>
        <div className="success-box"><span className="success-tick"><Check size={30} /></span>
          <h3>{done.hotelName}</h3><p>{done.roomName} · {fmtDate(done.checkIn)} → {fmtDate(done.checkOut)}</p>
          <div className="success-code">BOOKING ID <strong>{done.bookingCode}</strong></div>
          {done.movieTicketsIncluded > 0 && <div className="kv"><span>Movie screening tickets</span><b>{done.movieTicketsIncluded} included · choose a screening in My bookings</b></div>}
          <div className="kv"><span>Total</span><b>{money(done.amount)}</b></div>
          <div className="kv"><span>Payment</span><b>{done.payment.status === 'Paid' ? `Paid · ${done.payment.transactionId}` : 'Pay at hotel on arrival'}</b></div>
          <small>A confirmation has been added to My bookings.</small></div>
        <button className="btn-primary full" onClick={onClose}>View my bookings <ArrowRight size={16} /></button>
      </Modal>
    );
  }

  const steps = ['Stay', 'Guest details', 'Payment'];
  return (
    <Modal title={steps[step - 1]} kicker={`STEP ${step} OF 3`} onClose={onClose} wide>
      <div className="stepper">{steps.map((s, i) => <span key={s} className={i + 1 === step ? 'on' : i + 1 < step ? 'past' : ''}><b>{i + 1 < step ? <Check size={13} /> : i + 1}</b>{s}</span>)}</div>
      <div className="flow-room"><img src={room.image} alt={room.name} /><div><small>{hotel?.name} · {hotel?.city}</small><h3>{room.name}</h3><span className="rating"><Star size={13} fill="currentColor" /> {room.rating} · up to {room.capacity} guests</span></div></div>

      {step === 1 && <>
        <div className="form-grid">
          <label>CHECK IN<input type="date" min={todayIso()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} /></label>
          <label>CHECK OUT<input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
          <label className="span2">GUESTS<select value={guests} onChange={(e) => setGuests(+e.target.value)}>{Array.from({ length: room.capacity }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i ? 'guests' : 'guest'}</option>)}</select></label>
        </div>
        {hotelHasCinema && <fieldset className="movie-booking-option">
          <legend>MOVIE SCREENING</legend>
          <p>Add one screening ticket per guest for {money(MOVIE_TICKET_PRICE)} each. Choose your screening after booking.</p>
          <div className="movie-booking-choices">
            <label className={includeMovieScreening ? 'selected' : ''}><input type="radio" name="movie-screening" checked={includeMovieScreening} onChange={() => setIncludeMovieScreening(true)} /><span>Yes, add tickets</span></label>
            <label className={!includeMovieScreening ? 'selected' : ''}><input type="radio" name="movie-screening" checked={!includeMovieScreening} onChange={() => setIncludeMovieScreening(false)} /><span>No, thanks</span></label>
          </div>
        </fieldset>}
        {!free && nights > 0 && <div className="form-alert">This room is not available for the selected dates.</div>}
        <PriceBox room={room} nights={nights} subtotal={subtotal} taxes={taxes} total={total} movieTicketsIncluded={movieTicketsIncluded} movieTicketsAmount={movieTicketsAmount} />
      </>}

      {step === 2 && <div className="form-grid">
        <label className="span2">FULL NAME *<input value={g.fullName} onChange={setField('fullName')} placeholder="As on your ID" /></label>
        <label>EMAIL *<input type="email" value={g.email} onChange={setField('email')} placeholder="you@example.com" /></label>
        <label>PHONE *<input type="tel" value={g.phone} onChange={setField('phone')} placeholder="+91 98765 43210" /></label>
        <label>ID PROOF TYPE *<select value={g.idType} onChange={setField('idType')}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>ID NUMBER *<input value={g.idNumber} onChange={setField('idNumber')} placeholder="ID number" /></label>
        <label>CITY<input value={g.city} onChange={setField('city')} placeholder="Where are you travelling from?" /></label>
        <label>ARRIVAL TIME<input type="time" value={g.arrivalTime} onChange={setField('arrivalTime')} /></label>
        <label className="span2">ADDRESS<input value={g.address} onChange={setField('address')} placeholder="Street, area, pincode" /></label>
        <label className="span2">SPECIAL REQUESTS (OPTIONAL)<textarea value={g.specialRequests} onChange={setField('specialRequests')} placeholder="Late check-in, extra bed, dietary needs…" /></label>
      </div>}

      {step === 3 && <>
        <div className="pay-methods">{METHODS.map((m) => <button type="button" key={m.id} className={method === m.id ? 'on' : ''} onClick={() => { setMethod(m.id); setError(''); }}><m.icon size={18} />{m.label}</button>)}</div>
        {method === 'card' && <div className="form-grid">
          <label className="span2">CARD NUMBER<input inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} placeholder="1234 5678 9012 3456" /></label>
          <label className="span2">NAME ON CARD<input autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></label>
          <label>EXPIRY (MM/YY)<input inputMode="numeric" autoComplete="cc-exp" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} placeholder="MM/YY" /></label>
          <label>CVV<input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} placeholder="•••" /></label>
        </div>}
        {method === 'upi' && <div className="form-grid"><label className="span2">UPI ID<input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@okbank" /></label></div>}
        {method === 'netbanking' && <div className="form-grid"><label className="span2">SELECT YOUR BANK<select value={bank} onChange={(e) => setBank(e.target.value)}><option value="">Choose a bank…</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></label></div>}
        {method === 'hotel' && <div className="info-box">Reserve now and pay <b>{money(total)}</b> directly at the hotel when you arrive.</div>}
        <PriceBox room={room} nights={nights} subtotal={subtotal} taxes={taxes} total={total} movieTicketsIncluded={movieTicketsIncluded} movieTicketsAmount={movieTicketsAmount} compact />
        <div className="secure-note"><ShieldCheck size={18} /><span><strong>Demo payment</strong><small>No real money is charged. Only the card’s last 4 digits are saved; the full number and CVV are never stored.</small></span></div>
      </>}

      {error && <div className="form-alert" role="alert">{error}</div>}
      <div className="form-actions between">
        {step > 1 ? <button className="btn-light" onClick={() => { setStep(step - 1); setError(''); }}><ChevronLeft size={15} /> Back</button> : <span />}
        {step === 1 && <button className="btn-primary" onClick={next1}>Continue to guest details <ArrowRight size={16} /></button>}
        {step === 2 && <button className="btn-primary" onClick={next2}>Continue to payment <ArrowRight size={16} /></button>}
        {step === 3 && <button className="btn-primary" disabled={busy} onClick={confirm}>{busy ? 'Processing…' : method === 'hotel' ? 'Confirm booking' : `Pay ${money(total)} & confirm`} <Check size={16} /></button>}
      </div>
    </Modal>
  );
}

function PriceBox({ room, nights, subtotal, taxes, total, movieTicketsIncluded, movieTicketsAmount, compact }) {
  return (
    <div className="price-box">
      {!compact && <div><span>{money(room.price)} × {nights || 0} night{nights === 1 ? '' : 's'}</span><b>{money(subtotal)}</b></div>}
      {compact && <div><span>Room ({nights} night{nights === 1 ? '' : 's'})</span><b>{money(subtotal)}</b></div>}
      {movieTicketsIncluded > 0 && <div><span>Movie screening tickets ({movieTicketsIncluded} × {money(MOVIE_TICKET_PRICE)})</span><b>{money(movieTicketsAmount)}</b></div>}
      <div><span>Room taxes &amp; fees (12%)</span><b>{money(taxes)}</b></div>
      <div className="total"><span>Total</span><b>{money(total)}</b></div>
    </div>
  );
}
