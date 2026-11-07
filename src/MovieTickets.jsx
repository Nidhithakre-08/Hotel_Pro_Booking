import React, { useEffect, useState } from 'react';
import { Film, Ticket } from 'lucide-react';
import { Confirm, Modal } from './components.jsx';
import { request } from './lib/api.js';
import { fmtDate, money } from './lib/utils.js';

export default function MovieTickets({ booking, onClose, toast }) {
  const [screenings, setScreenings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [cancelTicket, setCancelTicket] = useState(null);
  const includedTickets = Number(booking.movieTicketsIncluded) || 0;
  const usedIncludedTickets = tickets
    .filter((ticket) => ticket.status === 'Confirmed' && ticket.paymentStatus === 'Paid with hotel booking')
    .reduce((total, ticket) => total + ticket.quantity, 0);
  const remainingIncludedTickets = Math.max(0, includedTickets - usedIncludedTickets);

  useEffect(() => {
    let active = true;
    request(`/movies?bookingId=${encodeURIComponent(booking.id)}`)
      .then((result) => {
        if (!active) return;
        setScreenings(result.screenings);
        setTickets(result.tickets);
      })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [booking.id]);

  async function reserve(screening) {
    setBusy(screening.id);
    setError('');
    try {
      const result = await request('/movies', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id, screeningId: screening.id, quantity: Number(quantities[screening.id] || 1) }),
      });
      setTickets((current) => [result.ticket, ...current]);
      setScreenings((current) => current.map((item) => item.id === screening.id ? { ...item, remaining: item.remaining - result.ticket.quantity } : item));
      toast(`Movie tickets reserved. ${result.ticket.paymentStatus}.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function cancel() {
    setBusy(cancelTicket.id);
    setError('');
    try {
      const { ticket } = await request(`/movies/${cancelTicket.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Cancelled' }) });
      setTickets((current) => current.map((item) => item.id === ticket.id ? ticket : item));
      setScreenings((current) => current.map((item) => item.id === ticket.screeningId ? { ...item, remaining: item.remaining + ticket.quantity } : item));
      toast('Movie ticket reservation cancelled.');
      setCancelTicket(null);
    } catch (e) { setError(e.message); setCancelTicket(null); }
    finally { setBusy(''); }
  }

  return <>
    <Modal title="Movie tickets" kicker={`${booking.hotelName} · BOOKING ${booking.bookingCode}`} onClose={onClose} wide>
      <div className="movie-booking-intro"><Film size={20} /><p>{includedTickets > 0 ? `Your hotel booking includes ${includedTickets} prepaid movie ticket${includedTickets === 1 ? '' : 's'}. Choose a screening during your stay; you will not be charged again.` : 'Enjoy a screening at your hotel cinema during your stay. Tickets are reserved now and paid at the cinema.'}</p></div>
      {error && <div className="form-alert">{error}</div>}
      {loading ? <div className="empty-state"><h3>Loading movie screenings…</h3></div> : <>
        <h3 className="movie-section-title">Screenings during your stay</h3>
        {screenings.length ? <div className="movie-screening-list">{screenings.map((screening) => (
          <article className="movie-screening" key={screening.id}>
            <span className="movie-screening-icon"><Film size={20} /></span>
            <div className="movie-screening-info"><h4>{screening.title}</h4><p>{fmtDate(screening.date)} · {screening.time} · {screening.duration} min · {screening.genre}</p><small>{screening.remaining} seats left · {includedTickets > 0 ? 'Included with your hotel booking' : `${money(screening.price)} per ticket`}</small></div>
            <div className="movie-screening-book">
              <select aria-label={`Ticket quantity for ${screening.title}`} value={quantities[screening.id] || 1} onChange={(e) => setQuantities((current) => ({ ...current, [screening.id]: e.target.value }))} disabled={!screening.remaining || (includedTickets > 0 && !remainingIncludedTickets)}>
                {Array.from({ length: Math.min(booking.guests, screening.remaining, includedTickets > 0 ? remainingIncludedTickets : booking.guests) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} ticket{index ? 's' : ''}</option>)}
              </select>
              <button className="btn-primary" disabled={!screening.remaining || (includedTickets > 0 && !remainingIncludedTickets) || !!busy} onClick={() => reserve(screening)}>{busy === screening.id ? 'Reserving…' : 'Book tickets'}</button>
            </div>
          </article>
        ))}</div> : <p className="movie-empty">No screenings are scheduled during these stay dates.</p>}
        <h3 className="movie-section-title">Your reservations</h3>
        {tickets.length ? <div className="movie-ticket-list">{tickets.map((ticket) => (
          <article className={`movie-ticket ${ticket.status === 'Cancelled' ? 'cancelled' : ''}`} key={ticket.id}>
            <Ticket size={18} /><div><strong>{ticket.title}</strong><small>{fmtDate(ticket.date)} · {ticket.time} · {ticket.quantity} ticket{ticket.quantity === 1 ? '' : 's'} · {ticket.ticketCode}</small><small>{money(ticket.amount)} · {ticket.paymentStatus} · {ticket.status}</small></div>
            {ticket.status === 'Confirmed' && <button className="danger" disabled={!!busy} onClick={() => setCancelTicket(ticket)}>Cancel</button>}
          </article>
        ))}</div> : <p className="movie-empty">No movie tickets reserved yet.</p>}
      </>}
    </Modal>
    {cancelTicket && <Confirm danger busy={busy === cancelTicket.id} title="Cancel movie tickets?" message={`Cancel ${cancelTicket.quantity} ticket${cancelTicket.quantity === 1 ? '' : 's'} for ${cancelTicket.title}?`} confirmLabel="Cancel tickets" onConfirm={cancel} onClose={() => setCancelTicket(null)} />}
  </>;
}
