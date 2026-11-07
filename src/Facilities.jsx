import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, Film, MapPin, Sparkles, Ticket, Waves, Wifi, Dumbbell, CarFront, Coffee, Utensils, X } from 'lucide-react';
import { Modal } from './components.jsx';
import { request } from './lib/api.js';
import { fmtDate, todayIso } from './lib/utils.js';

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

export const FACILITIES = [
  { id: 'pool', title: 'Swimming pools', eyebrow: 'MAKE A SPLASH', Icon: Waves, keywords: /pool|swim/i, image: image('photo-1576013551627-0cc20b96c2a7'), alt: 'A sunlit resort swimming pool', description: 'Unwind between outings with refreshing outdoor pools, comfortable loungers and a relaxed place to enjoy the day. Pool access and hours vary by property.' },
  { id: 'fitness', title: 'Fitness & wellness', eyebrow: 'FEEL YOUR BEST', Icon: Dumbbell, keywords: /gym|fitness|yoga/i, image: image('photo-1534438327276-14e5300c3a48'), alt: 'A bright hotel fitness studio', description: 'Keep your routine going with hotel fitness spaces and wellness activities. Check the property details for the equipment, classes and opening hours available during your stay.' },
  { id: 'dining', title: 'Restaurant dining', eyebrow: 'SAVOR THE STAY', Icon: Utensils, keywords: /restaurant|dining/i, image: image('photo-1414235077428-338989a2e8c0'), alt: 'A warmly lit hotel restaurant dining room', description: 'Enjoy a relaxed meal without leaving the hotel. Guests with an active stay can reserve a table for breakfast, lunch or dinner; menu and meal charges are handled by the hotel.' , action: 'dining' },
  { id: 'spa', title: 'Spa & relaxation', eyebrow: 'TAKE A BREATHER', Icon: Sparkles, keywords: /spa|wellness/i, image: image('photo-1540555700478-4be289fbecef'), alt: 'A serene spa treatment room', description: 'Make time to recharge with a restorative spa treatment. Reserve an appointment during your hotel stay and pay for the service at the property.', action: 'spa' },
  { id: 'wifi', title: 'Wi-Fi & connectivity', eyebrow: 'STAY IN SYNC', Icon: Wifi, keywords: /wi[\s-]?fi|internet|connectivity/i, image: image('photo-1497366754035-f200968a6e72'), alt: 'A comfortable hotel workspace', description: 'Stay connected for trip planning, work or sharing your journey. Included access, speed and coverage depend on the hotel.' },
  { id: 'cinema', title: 'In-house cinema', eyebrow: 'SCREEN TIME, HOTEL STYLE', Icon: Film, keywords: /cinema|movie/i, image: image('photo-1489599849927-2ee91cede3ba'), alt: 'A cinema auditorium with a large screen', description: 'Settle in for a movie screening at the hotel cinema. Guests with an active booking can browse scheduled screenings during their stay and reserve seats; tickets are paid for at the cinema.', action: 'cinema' },
  { id: 'parking', title: 'Parking & transfers', eyebrow: 'ARRIVE WITH EASE', Icon: CarFront, keywords: /parking|transfer|shuttle/i, image: image('photo-1449965408869-eaa3f722e40d'), alt: 'A hotel car ready for guest transfers', description: 'Make arrivals and day trips easier with property parking or transfer options. Availability, routes and any charges are confirmed directly with the hotel.' },
  { id: 'breakfast', title: 'Breakfast & dining', eyebrow: 'A GOOD START', Icon: Coffee, keywords: /breakfast|lunch|dinner|meal/i, image: image('photo-1533089860892-a7c6f0a88666'), alt: 'A freshly prepared breakfast at a hotel', description: 'Start the day at your own pace with breakfast and hotel dining options. Included meals, menus and serving times differ by property.' },
];

export function facilityForAmenity(amenity) {
  const known = FACILITIES.find((facility) => facility.keywords.test(amenity));
  if (known) return known;
  return {
    id: `amenity-${amenity.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: amenity,
    eyebrow: 'HOTEL FACILITY',
    Icon: Sparkles,
    keywords: new RegExp(amenity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    image: image('photo-1578683010236-d716f9a3f461'),
    alt: `${amenity} at a hotel`,
    description: `${amenity} is available at this property. Service details, access times and any additional charges are confirmed by the hotel during your stay.`,
  };
}

function dayBefore(iso) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function FacilityDetails({ facility, hotels, bookings, user, onClose, onViewHotel, onSignIn, onBookMovies, toast }) {
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [reservations, setReservations] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const eligibleHotels = useMemo(() => hotels.filter((hotel) => (hotel.amenities || []).some((amenity) => facility.keywords.test(amenity))), [hotels, facility]);
  const eligibleHotelIds = useMemo(() => new Set(eligibleHotels.map((hotel) => hotel.id)), [eligibleHotels]);
  const activeBookings = bookings.filter((booking) => eligibleHotelIds.has(booking.hotelId) && ['Confirmed', 'Checked-in'].includes(booking.status));
  const selectedBooking = activeBookings.find((booking) => booking.id === selectedBookingId);
  const dateMin = selectedBooking?.checkIn < todayIso() ? todayIso() : selectedBooking?.checkIn || todayIso();
  const timeOptions = facility.id === 'spa' ? ['10:00', '12:00', '14:00', '16:00'] : ['18:00', '19:30', '21:00'];
  const availableTimes = timeOptions.filter((option) => !date || new Date(`${date}T${option}:00+05:30`) > new Date());

  useEffect(() => {
    if (!selectedBooking || !facility.action || facility.action === 'cinema') return undefined;
    let active = true;
    setLoading(true);
    setError('');
    request(`/facilities/bookings?bookingId=${encodeURIComponent(selectedBooking.id)}`)
      .then(({ reservations: rows }) => { if (active) setReservations(rows.filter((item) => item.type === facility.action)); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    const firstAvailableDate = selectedBooking.checkIn < todayIso() ? todayIso() : selectedBooking.checkIn;
    setDate(firstAvailableDate);
    setTime(timeOptions.find((option) => new Date(`${firstAvailableDate}T${option}:00+05:30`) > new Date()) || timeOptions[0]);
    setGuests(1);
    return () => { active = false; };
  }, [selectedBookingId, facility.action]);

  async function reserve(e) {
    e.preventDefault();
    if (!user) { onSignIn(); return; }
    if (!selectedBooking) return;
    setBusy(true);
    setError('');
    try {
      const { reservation } = await request('/facilities/bookings', {
        method: 'POST',
        body: JSON.stringify({ bookingId: selectedBooking.id, type: facility.action, date, time, guests: Number(guests) }),
      });
      setReservations((current) => [reservation, ...current]);
      toast(`${reservation.facilityName} reserved. ${reservation.paymentStatus}.`);
    } catch (e2) { setError(e2.message); }
    finally { setBusy(false); }
  }

  async function cancelReservation(reservation) {
    setBusy(true);
    setError('');
    try {
      const { reservation: cancelled } = await request(`/facilities/bookings/${reservation.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      setReservations((current) => current.map((item) => item.id === cancelled.id ? cancelled : item));
      toast('Facility reservation cancelled.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const Icon = facility.Icon;
  return <Modal title={facility.title} kicker={facility.eyebrow} onClose={onClose} wide>
    <div className="facility-detail">
      <img className="facility-detail-photo" src={facility.image} alt={facility.alt} />
      <div className="facility-detail-copy"><span><Icon size={17} /> HOTEL EXPERIENCE</span><p>{facility.description}</p></div>
    </div>
    <div className="facility-hotels">
      <div className="facility-section-heading"><div><h3>Hotels with this facility</h3><p>{eligibleHotels.length ? `${eligibleHotels.length} matching propert${eligibleHotels.length === 1 ? 'y' : 'ies'}` : 'No hotels currently list this facility.'}</p></div></div>
      {eligibleHotels.length > 0 && <div className="facility-hotel-list">{eligibleHotels.map((hotel) => (
        <article className="facility-hotel" key={hotel.id}><img src={hotel.image} alt={hotel.name} /><div><strong>{hotel.name}</strong><small><MapPin size={12} /> {hotel.city} · {'★'.repeat(hotel.stars)}</small></div><button className="facility-link" onClick={() => onViewHotel(hotel.id)}>View hotel <ArrowRight size={14} /></button></article>
      ))}</div>}
    </div>
    {facility.action === 'cinema' && <section className="facility-action">
      <div className="facility-section-heading"><div><h3>Book a movie screening</h3><p>Choose an active hotel stay at a property with an in-house cinema.</p></div></div>
      {activeBookings.length ? activeBookings.map((booking) => <div className="facility-booking-choice" key={booking.id}><span><strong>{booking.hotelName}</strong><small>{fmtDate(booking.checkIn)} – {fmtDate(booking.checkOut)} · {booking.bookingCode}</small></span><button className="btn-primary" onClick={() => onBookMovies(booking)}><Film size={15} /> Choose a movie</button></div>) : <div className="facility-hint">{user ? 'Book an eligible hotel stay to reserve its movie screenings.' : 'Sign in and book a hotel stay with a cinema to reserve movie tickets.'}</div>}
    </section>}
    {(facility.action === 'spa' || facility.action === 'dining') && <section className="facility-action">
      <div className="facility-section-heading"><div><h3>{facility.action === 'spa' ? 'Book a spa appointment' : 'Reserve a restaurant table'}</h3><p>Reservations are available to guests with an active stay at a matching hotel.</p></div></div>
      {activeBookings.length ? <>
        <label className="facility-field">HOTEL BOOKING
          <select value={selectedBookingId} onChange={(e) => setSelectedBookingId(e.target.value)}>
            <option value="">Choose an active hotel booking</option>
            {activeBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.hotelName} · {booking.bookingCode}</option>)}
          </select>
        </label>
        {selectedBooking && <div className="facility-reservation-area">
          {error && <div className="form-alert">{error}</div>}
          <form className="facility-reservation-form" onSubmit={reserve}>
            <label className="facility-field"><CalendarDays size={14} /> DATE
              <input type="date" min={dateMin} max={dayBefore(selectedBooking.checkOut)} value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="facility-field"><Clock3 size={14} /> TIME
              <select value={time} onChange={(e) => setTime(e.target.value)} required disabled={!availableTimes.length}>{availableTimes.map((option) => <option key={option} value={option}>{option}</option>)}</select>
            </label>
            <label className="facility-field"><Ticket size={14} /> GUESTS
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>{Array.from({ length: selectedBooking.guests }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} guest{index ? 's' : ''}</option>)}</select>
            </label>
            <button className="btn-primary" disabled={busy || loading || !availableTimes.length}>{busy ? 'Reserving…' : facility.action === 'spa' ? 'Reserve spa session' : 'Reserve table'}</button>
          </form>
          {!availableTimes.length && <p className="facility-hint">No appointment times remain for this date. Choose another date during your stay.</p>}
          <p className="facility-payment-note">{facility.action === 'spa' ? 'Spa treatments: ₹1,800 per guest, payable at the hotel.' : 'Table reservations have no prepayment; order and pay at the restaurant.'}</p>
          <h4 className="facility-reservations-title">Your reservations</h4>
          {loading ? <p className="facility-hint">Loading reservations…</p> : reservations.length ? reservations.map((reservation) => (
            <div className={`facility-reservation ${reservation.status === 'Cancelled' ? 'cancelled' : ''}`} key={reservation.id}>
              <span><Check size={15} /><strong>{reservation.facilityName}</strong><small>{fmtDate(reservation.date)} · {reservation.time} · {reservation.guests} guest{reservation.guests === 1 ? '' : 's'} · {reservation.status}</small></span>
              {reservation.status === 'Confirmed' && <button className="facility-cancel" disabled={busy} onClick={() => cancelReservation(reservation)}><X size={14} /> Cancel</button>}
            </div>
          )) : <p className="facility-hint">No reservations for this stay yet.</p>}
        </div>}
      </> : <div className="facility-hint">{user ? 'Book an eligible hotel stay to reserve this facility.' : <button className="facility-link" onClick={onSignIn}>Sign in to reserve <ArrowRight size={14} /></button>}</div>}
    </section>}
  </Modal>;
}
