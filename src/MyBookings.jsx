import React, { useState } from 'react';
import { ArrowRight, CalendarCheck, CalendarDays, CreditCard, Film, Mail, MapPin, Phone, Trash2, Users, XCircle } from 'lucide-react';
import { Confirm, Modal, StatusPill } from './components.jsx';
import { request } from './lib/api.js';
import { fmtDate, fmtDateTime, money } from './lib/utils.js';
import MovieTickets from './MovieTickets.jsx';

const payLabel = (p) => !p ? '—' : p.method === 'card' ? `${p.cardBrand || 'Card'} •••• ${p.cardLast4}` : p.method === 'upi' ? `UPI · ${p.upiId}` : p.method === 'netbanking' ? `Net banking · ${p.bank}` : 'Pay at hotel';

export default function MyBookings({ bookings, loading, setPage, onChanged, toast }) {
  const [tab, setTab] = useState('All');
  const [view, setView] = useState(null);
  const [movieBooking, setMovieBooking] = useState(null);
  const [ask, setAsk] = useState(null); // {type:'cancel'|'delete', booking}
  const [busy, setBusy] = useState(false);
  const tabs = ['All', 'Upcoming', 'Completed', 'Cancelled'];
  const list = bookings.filter((b) => tab === 'All' || (tab === 'Upcoming' && ['Confirmed', 'Checked-in'].includes(b.status)) || b.status === tab);

  async function run() {
    setBusy(true);
    try {
      if (ask.type === 'cancel') { await request(`/bookings/${ask.booking.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Cancelled' }) }); toast(`Booking ${ask.booking.bookingCode} cancelled.${ask.booking.payment?.status === 'Paid' ? ' Your refund is on its way.' : ''}`); }
      else { await request(`/bookings/${ask.booking.id}`, { method: 'DELETE' }); toast('Booking deleted.'); }
      setAsk(null); setView(null); await onChanged();
    } catch (e) { toast(e.message); setAsk(null); } finally { setBusy(false); }
  }

  return (
    <section className="page-content">
      <div className="section-kicker">YOUR TRAVEL JOURNAL</div>
      <div className="page-title-row"><div><h2>Your <em>bookings</em></h2><p className="page-lead">View, cancel or delete your reservations.</p></div><button className="primary-btn" onClick={() => setPage('Discover')}>Find a stay <ArrowRight size={16} /></button></div>
      <div className="type-filters tabs-row">{tabs.map((t) => <button key={t} className={tab === t ? 'filter-active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {loading ? <div className="empty-state"><h3>Loading your bookings…</h3></div> : list.length === 0 ? <div className="empty-state"><CalendarCheck size={30} /><h3>{bookings.length ? 'Nothing here' : 'Your next adventure is waiting'}</h3><p>{bookings.length ? 'No bookings in this category.' : 'You haven’t booked a stay yet.'}</p><button onClick={() => setPage('Discover')}>Explore stays <ArrowRight size={15} /></button></div> :
        <div className="booking-list">{list.map((b) => (
          <article className="booking-card" key={b.id}>
            <img src={b.image} alt={b.roomName} />
            <div className="booking-details">
              <div className="booking-status"><StatusPill status={b.status} /><small>BOOKING ID · {b.bookingCode}</small></div>
              <h3>{b.hotelName}</h3><div className="booking-sub">{b.roomName} · {b.hotelCity}</div>
              <div className="booking-meta"><span><CalendarDays size={15} />{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</span><span><Users size={15} />{b.guests} guest{b.guests > 1 ? 's' : ''}</span><span><CreditCard size={15} />{payLabel(b.payment)} · <StatusPill status={b.payment?.status || 'Pending'} /></span></div>
            </div>
            <div className="booking-price"><small>TOTAL AMOUNT</small><strong>{money(b.amount)}</strong><span>{b.nights} night{b.nights > 1 ? 's' : ''} · incl. taxes</span>
              <div className="booking-actions"><button onClick={() => setView(b)}>View details</button>
                {b.hotelHasCinema && ['Confirmed', 'Checked-in'].includes(b.status) && <button onClick={() => setMovieBooking(b)}><Film size={14} /> Movie tickets</button>}
                {b.status === 'Confirmed' && <button className="danger" onClick={() => setAsk({ type: 'cancel', booking: b })}><XCircle size={14} /> Cancel</button>}
                {['Cancelled', 'Completed'].includes(b.status) && <button className="danger" onClick={() => setAsk({ type: 'delete', booking: b })}><Trash2 size={14} /> Delete</button>}</div></div>
          </article>))}</div>}

      {view && !ask && <Modal title={view.hotelName} kicker={`BOOKING ${view.bookingCode}`} onClose={() => setView(null)} wide>
        <div className="detail-grid">
          <div className="detail-card"><h4><CalendarDays size={16} /> Stay</h4><div className="kv"><span>Room</span><b>{view.roomName} ({view.roomType})</b></div><div className="kv"><span>Check in</span><b>{fmtDate(view.checkIn)}</b></div><div className="kv"><span>Check out</span><b>{fmtDate(view.checkOut)}</b></div><div className="kv"><span>Nights / guests</span><b>{view.nights} / {view.guests}</b></div><div className="kv"><span>Status</span><StatusPill status={view.status} /></div><div className="kv"><span>Booked on</span><b>{fmtDateTime(view.createdAt)}</b></div></div>
          <div className="detail-card"><h4><Users size={16} /> Guest details</h4><div className="kv"><span>Name</span><b>{view.guest?.fullName}</b></div><div className="kv"><span><Mail size={13} /> Email</span><b>{view.guest?.email}</b></div><div className="kv"><span><Phone size={13} /> Phone</span><b>{view.guest?.phone}</b></div><div className="kv"><span>ID proof</span><b>{view.guest?.idType} · {view.guest?.idNumber}</b></div>{view.guest?.city && <div className="kv"><span><MapPin size={13} /> City</span><b>{view.guest.city}</b></div>}{view.guest?.arrivalTime && <div className="kv"><span>Arrival</span><b>{view.guest.arrivalTime}</b></div>}{view.guest?.specialRequests && <div className="kv"><span>Requests</span><b>{view.guest.specialRequests}</b></div>}</div>
          <div className="detail-card span2"><h4><CreditCard size={16} /> Payment</h4><div className="kv"><span>Method</span><b>{payLabel(view.payment)}</b></div><div className="kv"><span>Status</span><StatusPill status={view.payment?.status || 'Pending'} /></div>{view.payment?.transactionId && <div className="kv"><span>Transaction ID</span><b>{view.payment.transactionId}</b></div>}<div className="kv"><span>Room ({view.nights} × {money(view.pricePerNight)})</span><b>{money(view.subtotal)}</b></div>{view.movieTicketsIncluded > 0 && <div className="kv"><span>Movie screening tickets ({view.movieTicketsIncluded})</span><b>{money(view.movieTicketsAmount)}</b></div>}<div className="kv"><span>Taxes &amp; fees</span><b>{money(view.taxes)}</b></div><div className="kv total"><span>Total</span><b>{money(view.amount)}</b></div></div>
        </div>
        <div className="form-actions">
          <button className="btn-light" onClick={() => window.print()}>Print</button>
          {view.status === 'Confirmed' && <button className="btn-danger" onClick={() => setAsk({ type: 'cancel', booking: view })}><XCircle size={15} /> Cancel booking</button>}
          {view.hotelHasCinema && ['Confirmed', 'Checked-in'].includes(view.status) && <button className="btn-primary" onClick={() => { setMovieBooking(view); setView(null); }}><Film size={15} /> Book movie tickets</button>}
          {['Cancelled', 'Completed'].includes(view.status) && <button className="btn-danger" onClick={() => setAsk({ type: 'delete', booking: view })}><Trash2 size={15} /> Delete booking</button>}
        </div>
      </Modal>}

      {movieBooking && <MovieTickets booking={movieBooking} onClose={() => setMovieBooking(null)} toast={toast} />}

      {ask && <Confirm danger busy={busy} title={ask.type === 'cancel' ? 'Cancel this booking?' : 'Delete this booking?'} confirmLabel={ask.type === 'cancel' ? 'Yes, cancel booking' : 'Yes, delete'}
        message={ask.type === 'cancel' ? `Your stay at ${ask.booking.hotelName} (${fmtDate(ask.booking.checkIn)} – ${fmtDate(ask.booking.checkOut)}) will be cancelled and the room released.${ask.booking.payment?.status === 'Paid' ? ' A refund will be issued.' : ''}` : `${ask.booking.bookingCode} will be permanently removed from your list. This cannot be undone.`}
        onConfirm={run} onClose={() => setAsk(null)} />}
    </section>
  );
}
