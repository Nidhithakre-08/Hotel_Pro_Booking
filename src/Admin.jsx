import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BedDouble, Bell, Building2, CalendarCheck, CreditCard, Edit3, Film, Hotel, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, Plus, Search, ShieldCheck, Sparkles, Trash2, Users, Wallet, X, Eye, LifeBuoy } from 'lucide-react';
import { request, TOKEN_KEYS } from './lib/api.js';
import { Confirm, ImageInput, Modal, StatusPill } from './components.jsx';
import { ROOM_TYPES, fmtDate, fmtDateTime, money } from './lib/utils.js';
import { waPhone } from './lib/support.js';
import './admin.css';

const api = (path, opts) => request(path, opts, 'admin');
const NAV = [['Dashboard', LayoutDashboard], ['Hotels', Building2], ['Rooms', BedDouble], ['Bookings', CalendarCheck], ['Customers', Users], ['Tickets', LifeBuoy]];

export default function Admin() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEYS.admin)) return setChecking(false);
    api('/auth/me').then((d) => setAdmin(d.admin)).catch(() => localStorage.removeItem(TOKEN_KEYS.admin)).finally(() => setChecking(false));
  }, []);
  if (checking) return <div className="adm-loading">Loading…</div>;
  if (!admin) return <AdminLogin onLogin={setAdmin} />;
  return <Panel admin={admin} onLogout={() => { localStorage.removeItem(TOKEN_KEYS.admin); setAdmin(null); }} />;
}

export function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { const d = await api('/auth/admin-login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem(TOKEN_KEYS.admin, d.token); onLogin(d.admin); }
    catch (x) { setError(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="adm-login">
      <div className="adm-login-card">
        <div className="adm-login-brand"><span><Hotel size={22} /></span> hotelpro<i>.</i> <em>ADMIN</em></div>
        <h1>Administrator sign in</h1>
        <p>This area is for HotelPro staff only. Guests should use the <a href="/">customer site</a>.</p>
        <form onSubmit={submit}>
          <label>ADMIN EMAIL</label><div className="adm-input"><Mail size={17} /><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" required /></div>
          <label>PASSWORD</label><div className="adm-input"><LockKeyhole size={17} /><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin password" required /></div>
          {error && <div className="adm-error" role="alert">{error}</div>}
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in to admin panel'}</button>
        </form>
        <div className="adm-secure"><ShieldCheck size={15} /> Authorised personnel only</div>
      </div>
    </div>
  );
}

export function Panel({ admin, onLogout }) {
  const [page, setPage] = useState('Dashboard');
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [data, setData] = useState({ hotels: [], rooms: [], bookings: [], users: [], tickets: [], stats: null, recent: [] });
  const [error, setError] = useState('');
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); } }, [toast]);

  const load = useCallback(async () => {
    try {
      const [h, r, b, u, s, t] = await Promise.all([api('/hotels'), api('/rooms'), api('/bookings'), api('/admin/users'), api('/admin/stats'), api('/tickets')]);
      setData({ hotels: h.hotels, rooms: r.rooms, bookings: b.bookings, users: u.users, tickets: t.tickets, stats: s.stats, recent: s.recentBookings }); setError('');
    } catch (e) { if (e.status === 401 || e.status === 403) onLogout(); else setError(e.message); }
  }, []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  const loadNotifications = useCallback(async () => {
    try { setNotifications((await api('/admin/notifications')).notifications); }
    catch (e) { if (e.status === 401 || e.status === 403) onLogout(); else setError(e.message); }
  }, [onLogout]);
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);
  async function markNotificationRead(notification) {
    try {
      const result = await api('/admin/notifications', { method: 'PUT', body: JSON.stringify({ id: notification.id }) });
      setNotifications((current) => current.map((item) => item.id === notification.id ? result.notification : item));
    } catch (e) { setToast(e.message); }
  }
  async function markAllNotificationsRead() {
    try {
      await api('/admin/notifications', { method: 'PUT', body: JSON.stringify({ all: true }) });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (e) { setToast(e.message); }
  }
  function openNotification(notification) {
    markNotificationRead(notification);
    setPage(notification.type.startsWith('booking') || notification.type === 'movie_ticket' || notification.type === 'facility_reservation' ? 'Bookings' : notification.type === 'login' ? 'Customers' : 'Tickets');
    setNotificationsOpen(false);
  }
  const ctx = { ...data, reload: load, toast: setToast, setPage };
  return (
    <div className="adm-shell">
      <aside className={`adm-side ${menu ? 'open' : ''}`}>
        <div className="adm-brand"><span><Hotel size={20} /></span><div>hotelpro<i>.</i><small>ADMIN PANEL</small></div><button className="adm-close" onClick={() => setMenu(false)}><X size={18} /></button></div>
        <nav>{NAV.map(([n, Icon]) => <button key={n} className={page === n ? 'on' : ''} onClick={() => { setPage(n); setMenu(false); }}><Icon size={18} /> {n}{n === 'Tickets' && data.tickets.filter((t) => t.status === 'Open').length > 0 && <b className="adm-count">{data.tickets.filter((t) => t.status === 'Open').length}</b>}</button>)}</nav>
        <div className="adm-side-bottom"><div className="adm-me"><b>{admin.name}</b><small>{admin.email}</small></div><button onClick={onLogout}><LogOut size={16} /> Sign out</button><a href="/" className="adm-link">View customer site →</a></div>
      </aside>
      {menu && <div className="adm-overlay" onClick={() => setMenu(false)} />}
      <main className="adm-main">
        <header className="adm-top"><button className="adm-burger" onClick={() => setMenu(true)}><Menu size={21} /></button><h1>{page}</h1>
          <button className="adm-notification-toggle" aria-label="Admin notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={19} />{notifications.some((item) => !item.read) && <i>{notifications.filter((item) => !item.read).length}</i>}</button>
          <span className="adm-badge"><ShieldCheck size={14} /> Admin</span>
          {notificationsOpen && <section className="adm-notifications" aria-label="Admin notifications">
            <div className="adm-notifications-head"><div><h2>Notifications</h2><p>Recent activity across HotelPro</p></div><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={17} /></button></div>
            {notifications.length ? <div className="adm-notification-list">{notifications.map((notification) => {
              const Icon = notification.type === 'movie_ticket' ? Film : notification.type.startsWith('booking') || notification.type === 'facility_reservation' ? CalendarCheck : notification.type === 'login' ? Users : LifeBuoy;
              return <button key={notification.id} className={`adm-notification-item ${notification.read ? '' : 'unread'}`} onClick={() => openNotification(notification)}>
                <span className="adm-notification-icon"><Icon size={17} /></span>
                <span><strong>{notification.message}</strong><small>{fmtDateTime(notification.createdAt)}</small></span>
                {!notification.read && <i />}
              </button>;
            })}</div> : <p className="adm-notifications-empty">No activity yet. New bookings, movie reservations, tickets, appointments and sign-ins will appear here.</p>}
            {notifications.some((item) => !item.read) && <button className="adm-mark-all-read" onClick={markAllNotificationsRead}>Mark all as read</button>}
          </section>}
        </header>
        {error && <div className="adm-banner">{error} <button onClick={load}>Retry</button></div>}
        <div className="adm-content">
          {page === 'Dashboard' && <Dashboard admin={admin} {...ctx} />}
          {page === 'Hotels' && <Hotels {...ctx} />}
          {page === 'Rooms' && <Rooms {...ctx} />}
          {page === 'Bookings' && <Bookings {...ctx} />}
          {page === 'Customers' && <Customers {...ctx} />}
          {page === 'Tickets' && <Tickets {...ctx} />}
        </div>
      </main>
      {toast && <div className="adm-toast">{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}
    </div>
  );
}

export function Dashboard({ admin, stats, recent, setPage, hotels, rooms }) {
  if (!stats) return <p>Loading…</p>;
  const cards = [['Revenue (paid)', money(stats.revenue), Wallet, `${money(stats.pending)} pending at hotel`], ['Bookings', stats.bookings, CalendarCheck, `${stats.activeBookings} active · ${stats.cancelled} cancelled`], ['Hotels', stats.hotels, Building2, `${stats.rooms} rooms in total`], ['Customers', stats.customers, Users, `${stats.occupiedToday} rooms occupied today`]];
  return <>
    <section className="adm-welcome">
      <img className="adm-welcome-image" src={hotels[0]?.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85'} alt="" />
      <div className="adm-welcome-copy">
        <span className="adm-welcome-kicker"><Sparkles size={14} /> YOUR HOTELPRO OVERVIEW</span>
        <h2>Welcome, {admin.name?.split(/\s+/)[0] || 'there'}.</h2>
        <p className="adm-welcome-admin">Administrator: Miss. Nidhi Thakre</p>
        <p>Everything you need to create a better stay, all in one place.</p>
        <div className="adm-welcome-actions">
          <button onClick={() => setPage('Hotels')}><Plus size={16} /> Add a property</button>
          <button onClick={() => setPage('Bookings')}>View bookings <ArrowRight size={15} /></button>
        </div>
      </div>
      <div className="adm-welcome-note"><Hotel size={15} /> Hospitality, thoughtfully managed</div>
    </section>
    <div className="adm-stats">{cards.map(([t, v, I, s]) => <div className="adm-stat" key={t}><div><span>{t}</span><span className="adm-stat-icon"><I size={18} /></span></div><strong>{v}</strong><small>{s}</small></div>)}</div>
    <div className="adm-two">
      <section className="adm-card"><div className="adm-card-head"><h3>Recent bookings</h3><button onClick={() => setPage('Bookings')}>View all →</button></div>
        {recent.length ? recent.map((b) => <div className="adm-row" key={b.id}><img src={b.image} alt="" /><div><b>{b.guest?.fullName}</b><small>{b.hotelName} · {b.roomName}</small><small>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</small></div><div className="r"><b>{money(b.amount)}</b><StatusPill status={b.status} /></div></div>) : <p className="adm-empty">No bookings yet.</p>}</section>
      <section className="adm-card"><div className="adm-card-head"><h3>Quick actions</h3></div>
        <div className="adm-quick"><button onClick={() => setPage('Hotels')}><Plus size={16} /> Add a hotel</button><button onClick={() => setPage('Rooms')}><Plus size={16} /> Add a room</button><button onClick={() => setPage('Bookings')}><CalendarCheck size={16} /> Manage bookings</button></div>
        <h4 className="adm-sub">Room status</h4>
        <div className="adm-kv"><span>Available</span><b>{rooms.filter((r) => r.status === 'Available').length}</b></div><div className="adm-kv"><span>Maintenance</span><b>{rooms.filter((r) => r.status === 'Maintenance').length}</b></div><div className="adm-kv"><span>Hidden</span><b>{rooms.filter((r) => r.status === 'Hidden').length}</b></div><div className="adm-kv"><span>Active hotels</span><b>{hotels.filter((h) => h.status !== 'Inactive').length}</b></div>
      </section>
    </div></>;
}

export function Hotels({ hotels, reload, toast }) {
  const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  async function remove() { setBusy(true); try { await api(`/hotels/${del.id}`, { method: 'DELETE' }); toast('Hotel deleted'); setDel(null); reload(); } catch (e) { toast(e.message); setDel(null); } finally { setBusy(false); } }
  return <>
    <div className="adm-toolbar"><p>{hotels.length} hotel{hotels.length === 1 ? '' : 's'}</p><button className="adm-btn" onClick={() => setEdit({})}><Plus size={16} /> Add hotel</button></div>
    <div className="adm-grid">{hotels.map((h) => <article className="adm-hotel" key={h.id}><img src={h.image} alt={h.name} /><div className="adm-hotel-body"><div className="adm-title"><h3>{h.name}</h3><StatusPill status={h.status || 'Active'} /></div><small>{h.city}, {h.country} · {'★'.repeat(h.stars)}</small><p>{h.roomCount} room{h.roomCount === 1 ? '' : 's'}{h.fromPrice != null && <> · from {money(h.fromPrice)}</>}</p><div className="adm-actions"><button onClick={() => setEdit(h)}><Edit3 size={15} /> Edit</button><button className="danger" onClick={() => setDel(h)}><Trash2 size={15} /> Delete</button></div></div></article>)}</div>
    {hotels.length === 0 && <p className="adm-empty">No hotels yet. Click “Add hotel”.</p>}
    {edit && <HotelForm hotel={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast('Hotel saved'); reload(); }} />}
    {del && <Confirm danger busy={busy} title="Delete hotel?" message={`“${del.name}” and all its rooms will be permanently deleted.`} confirmLabel="Delete hotel" onConfirm={remove} onClose={() => setDel(null)} />}
  </>;
}

export function HotelForm({ hotel, onClose, onSaved }) {
  const isNew = !hotel.id;
  const [f, setF] = useState({ name: hotel.name || '', city: hotel.city || '', country: hotel.country || 'India', address: hotel.address || '', description: hotel.description || '', stars: hotel.stars || 4, amenities: (hotel.amenities || []).join(', '), image: hotel.image || '', status: hotel.status || 'Active' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api(isNew ? '/hotels' : `/hotels/${hotel.id}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(f) }); onSaved(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return <Modal title={isNew ? 'Add hotel' : 'Edit hotel'} kicker="HOTEL DETAILS" onClose={onClose} wide>
    <form onSubmit={save} className="adm-form">
      <label>HOTEL NAME *<input value={f.name} onChange={set('name')} required /></label>
      <label>CITY *<input value={f.city} onChange={set('city')} required /></label>
      <label>COUNTRY<input value={f.country} onChange={set('country')} /></label>
      <label>STAR RATING<select value={f.stars} onChange={set('stars')}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star</option>)}</select></label>
      <label className="full">ADDRESS<input value={f.address} onChange={set('address')} /></label>
      <label className="full">DESCRIPTION<textarea value={f.description} onChange={set('description')} /></label>
      <label className="full">AMENITIES (COMMA SEPARATED)<input value={f.amenities} onChange={set('amenities')} placeholder="Swimming pool, Gym, Breakfast, Spa, In-house cinema" /></label>
      <label>STATUS<select value={f.status} onChange={set('status')}><option>Active</option><option>Inactive</option></select></label>
      <div className="full"><ImageInput label="HOTEL PHOTO" value={f.image} onChange={(v) => setF((p) => ({ ...p, image: v }))} /></div>
      {err && <div className="adm-error full">{err}</div>}
      <div className="form-actions full"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save hotel'}</button></div>
    </form></Modal>;
}

export function Rooms({ rooms, hotels, reload, toast }) {
  const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const [hf, setHf] = useState('all'); const [q, setQ] = useState('');
  const hotelName = useMemo(() => Object.fromEntries(hotels.map((h) => [h.id, h.name])), [hotels]);
  const list = rooms.filter((r) => (hf === 'all' || r.hotelId === hf) && `${r.name} ${r.type}`.toLowerCase().includes(q.toLowerCase()));
  async function remove() { setBusy(true); try { await api(`/rooms/${del.id}`, { method: 'DELETE' }); toast('Room deleted'); setDel(null); reload(); } catch (e) { toast(e.message); setDel(null); } finally { setBusy(false); } }
  async function setStatus(r, status) { try { await api(`/rooms/${r.id}`, { method: 'PUT', body: JSON.stringify({ status }) }); toast(`${r.name} is now ${status}`); reload(); } catch (e) { toast(e.message); } }
  return <>
    <div className="adm-toolbar"><div className="adm-filters"><div className="adm-search"><Search size={15} /><input placeholder="Search rooms…" value={q} onChange={(e) => setQ(e.target.value)} /></div><select value={hf} onChange={(e) => setHf(e.target.value)}><option value="all">All hotels</option>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div><button className="adm-btn" disabled={!hotels.length} onClick={() => setEdit({})}><Plus size={16} /> Add room</button></div>
    <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Room</th><th>Hotel</th><th>Type</th><th>Guests</th><th>Price / night</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {list.map((r) => <tr key={r.id}><td><div className="adm-cell"><img src={r.image} alt="" /><div><b>{r.name}</b><small>{r.id}</small></div></div></td><td>{hotelName[r.hotelId] || '—'}</td><td>{r.type}</td><td>{r.capacity}</td><td><b>{money(r.price)}</b></td>
        <td><select className={`adm-status s-${r.status}`} value={r.status} onChange={(e) => setStatus(r, e.target.value)}><option>Available</option><option>Maintenance</option><option>Hidden</option></select></td>
        <td><div className="adm-actions inline"><button onClick={() => setEdit(r)} aria-label="Edit room"><Edit3 size={15} /></button><button className="danger" onClick={() => setDel(r)} aria-label="Delete room"><Trash2 size={15} /></button></div></td></tr>)}
    </tbody></table>{list.length === 0 && <p className="adm-empty">No rooms found.</p>}</div>
    {edit && <RoomForm room={edit} hotels={hotels} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast('Room saved'); reload(); }} />}
    {del && <Confirm danger busy={busy} title="Delete room?" message={`“${del.name}” will be permanently deleted.`} confirmLabel="Delete room" onConfirm={remove} onClose={() => setDel(null)} />}
  </>;
}

export function RoomForm({ room, hotels, onClose, onSaved }) {
  const isNew = !room.id;
  const [f, setF] = useState({ hotelId: room.hotelId || hotels[0]?.id || '', name: room.name || '', type: room.type || 'Deluxe', price: room.price || '', capacity: room.capacity || 2, beds: room.beds || '', size: room.size || '', tag: room.tag || '', description: room.description || '', amenities: (room.amenities || []).join(', '), image: room.image || '', status: room.status || 'Available' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api(isNew ? '/rooms' : `/rooms/${room.id}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(f) }); onSaved(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return <Modal title={isNew ? 'Add room' : 'Edit room'} kicker="ROOM DETAILS" onClose={onClose} wide>
    <form onSubmit={save} className="adm-form">
      <label>HOTEL *<select value={f.hotelId} onChange={set('hotelId')} required>{hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      <label>ROOM NAME *<input value={f.name} onChange={set('name')} required /></label>
      <label>TYPE *<select value={f.type} onChange={set('type')}>{[...new Set([...ROOM_TYPES, f.type])].map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>PRICE PER NIGHT (₹) *<input type="number" min="1" value={f.price} onChange={set('price')} required /></label>
      <label>MAX GUESTS *<input type="number" min="1" max="20" value={f.capacity} onChange={set('capacity')} required /></label>
      <label>BEDS<input value={f.beds} onChange={set('beds')} placeholder="1 King bed" /></label>
      <label>SIZE<input value={f.size} onChange={set('size')} placeholder="36 m²" /></label>
      <label>BADGE<input value={f.tag} onChange={set('tag')} placeholder="e.g. BEST VALUE" /></label>
      <label>STATUS<select value={f.status} onChange={set('status')}><option>Available</option><option>Maintenance</option><option>Hidden</option></select></label>
      <label className="full">DESCRIPTION<textarea value={f.description} onChange={set('description')} /></label>
      <label className="full">AMENITIES (COMMA SEPARATED)<input value={f.amenities} onChange={set('amenities')} placeholder="Wi-Fi, Breakfast, AC" /></label>
      <div className="full"><ImageInput label="ROOM PHOTO" value={f.image} onChange={(v) => setF((p) => ({ ...p, image: v }))} /></div>
      {err && <div className="adm-error full">{err}</div>}
      <div className="form-actions full"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button></div>
    </form></Modal>;
}

export function Bookings({ bookings, reload, toast }) {
  const [tab, setTab] = useState('All'); const [q, setQ] = useState(''); const [view, setView] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const list = bookings.filter((b) => (tab === 'All' || b.status === tab) && `${b.bookingCode} ${b.guest?.fullName} ${b.guest?.email} ${b.hotelName} ${b.roomName}`.toLowerCase().includes(q.toLowerCase()));
  async function patch(b, body, msg) { try { const d = await api(`/bookings/${b.id}`, { method: 'PUT', body: JSON.stringify(body) }); toast(msg); if (view?.id === b.id) setView(d.booking); reload(); } catch (e) { toast(e.message); } }
  async function remove() { setBusy(true); try { await api(`/bookings/${del.id}`, { method: 'DELETE' }); toast('Booking deleted'); setDel(null); setView(null); reload(); } catch (e) { toast(e.message); setDel(null); } finally { setBusy(false); } }
  return <>
    <div className="adm-toolbar"><div className="adm-tabs">{['All', 'Confirmed', 'Checked-in', 'Completed', 'Cancelled'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div><div className="adm-search"><Search size={15} /><input placeholder="Search booking, guest, hotel…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
    <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Booking</th><th>Guest</th><th>Hotel / room</th><th>Stay</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {list.map((b) => <tr key={b.id}><td><b>{b.bookingCode}</b><small>{fmtDateTime(b.createdAt)}</small></td><td><b>{b.guest?.fullName}</b><small>{b.guest?.phone}</small></td><td><b>{b.hotelName}</b><small>{b.roomName}</small></td><td>{fmtDate(b.checkIn)}<small>→ {fmtDate(b.checkOut)} · {b.nights}n</small></td><td><b>{money(b.amount)}</b></td>
        <td><StatusPill status={b.payment?.status || 'Pending'} /><small>{b.payment?.method}</small></td>
        <td><select className={`adm-status s-${b.status}`} value={b.status} onChange={(e) => patch(b, { status: e.target.value }, `Booking marked ${e.target.value}`)}><option>Confirmed</option><option>Checked-in</option><option>Completed</option><option>Cancelled</option></select></td>
        <td><div className="adm-actions inline"><button onClick={() => setView(b)} aria-label="View"><Eye size={15} /></button><button className="danger" onClick={() => setDel(b)} aria-label="Delete"><Trash2 size={15} /></button></div></td></tr>)}
    </tbody></table>{list.length === 0 && <p className="adm-empty">No bookings found.</p>}</div>
    {view && <Modal title={view.hotelName} kicker={`BOOKING ${view.bookingCode}`} onClose={() => setView(null)} wide>
      <div className="detail-grid">
        <div className="detail-card"><h4>Stay</h4><div className="kv"><span>Room</span><b>{view.roomName}</b></div><div className="kv"><span>Check in</span><b>{fmtDate(view.checkIn)}</b></div><div className="kv"><span>Check out</span><b>{fmtDate(view.checkOut)}</b></div><div className="kv"><span>Guests</span><b>{view.guests}</b></div><div className="kv"><span>Status</span><StatusPill status={view.status} /></div></div>
        <div className="detail-card"><h4>Guest</h4><div className="kv"><span>Name</span><b>{view.guest?.fullName}</b></div><div className="kv"><span>Email</span><b>{view.guest?.email}</b></div><div className="kv"><span>Phone</span><b>{view.guest?.phone}</b></div><div className="kv"><span>ID</span><b>{view.guest?.idType} · {view.guest?.idNumber}</b></div>{view.guest?.city && <div className="kv"><span>City</span><b>{view.guest.city}</b></div>}{view.guest?.specialRequests && <div className="kv"><span>Requests</span><b>{view.guest.specialRequests}</b></div>}</div>
        <div className="detail-card span2"><h4><CreditCard size={15} /> Payment</h4><div className="kv"><span>Method</span><b>{view.payment?.method}{view.payment?.cardLast4 ? ` •••• ${view.payment.cardLast4}` : ''}{view.payment?.upiId ? ` · ${view.payment.upiId}` : ''}{view.payment?.bank ? ` · ${view.payment.bank}` : ''}</b></div>{view.payment?.transactionId && <div className="kv"><span>Transaction</span><b>{view.payment.transactionId}</b></div>}<div className="kv"><span>Status</span>
          <select className={`adm-status s-${view.payment?.status}`} value={view.payment?.status} onChange={(e) => patch(view, { paymentStatus: e.target.value }, 'Payment status updated')}><option>Paid</option><option>Pending</option><option>Refunded</option></select></div><div className="kv total"><span>Total</span><b>{money(view.amount)}</b></div></div>
      </div></Modal>}
    {del && <Confirm danger busy={busy} title="Delete booking?" message={`${del.bookingCode} (${del.guest?.fullName}) will be permanently deleted.`} confirmLabel="Delete booking" onConfirm={remove} onClose={() => setDel(null)} />}
  </>;
}

export function Customers({ users, reload, toast }) {
  const [del, setDel] = useState(null);
  async function remove() { try { await api(`/admin/users/${del.id}`, { method: 'DELETE' }); toast('Customer deleted'); reload(); } catch (e) { toast(e.message); } setDel(null); }
  return <>
    <div className="adm-toolbar"><p>{users.length} registered customer{users.length === 1 ? '' : 's'}</p></div>
    <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
      {users.map((u) => <tr key={u.id}><td><b>{u.name}</b></td><td>{u.email}</td><td>{u.phone || '—'}</td><td>{u.bookings}</td><td>{fmtDate(u.createdAt?.slice(0, 10))}</td><td><div className="adm-actions inline"><button className="danger" onClick={() => setDel(u)} aria-label="Delete"><Trash2 size={15} /></button></div></td></tr>)}
    </tbody></table>{users.length === 0 && <p className="adm-empty">No customers have registered yet.</p>}</div>
    {del && <Confirm danger title="Delete customer?" message={`${del.name} (${del.email}) will be removed. Their past booking records stay in the system.`} confirmLabel="Delete customer" onConfirm={remove} onClose={() => setDel(null)} />}
  </>;
}

export function Tickets({ tickets, reload, toast }) {
  const [tab, setTab] = useState('All'); const [q, setQ] = useState(''); const [view, setView] = useState(null); const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false);
  const list = tickets.filter((t) => (tab === 'All' || t.status === tab) && `${t.ticketCode} ${t.name} ${t.phone} ${t.email} ${t.category} ${t.message}`.toLowerCase().includes(q.toLowerCase()));
  const open = tickets.find((t) => t.id === view);
  async function patch(t, body, msg) {
    setBusy(true);
    try { await api(`/tickets?id=${t.id}`, { method: 'PUT', body: JSON.stringify(body) }); toast(msg); setReply(''); await reload(); } catch (e) { toast(e.message); } finally { setBusy(false); }
  }
  const wa = (t) => `https://wa.me/${waPhone(t.phone)}?text=${encodeURIComponent(`Hi ${t.name}, this is HotelPro support about ticket ${t.ticketCode}.`)}`;
  return <>
    <div className="adm-toolbar"><div className="adm-tabs">{['All', 'Open', 'In progress', 'Resolved', 'Closed'].map((s) => <button key={s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>{s}</button>)}</div><div className="adm-search"><Search size={15} /><input placeholder="Search ticket, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
    <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Ticket</th><th>Customer</th><th>Topic</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
      {list.map((t) => <tr key={t.id}><td><b>{t.ticketCode}</b>{t.bookingCode && <small style={{ display: 'block' }}>{t.bookingCode}</small>}</td><td><b>{t.name}</b><small style={{ display: 'block' }}>{t.phone || t.email}</small></td><td>{t.category}{t.appointment && <small style={{ display: 'block' }}>{fmtDate(t.appointment.date)} · {t.appointment.slot}</small>}</td><td>{t.priority === 'High' ? <span className="pill pill-bad"><i />High</span> : 'Normal'}{t.escalated && <small style={{ display: 'block' }}>Escalated</small>}</td><td><span className={`pill pill-${{ Open: 'warn', 'In progress': 'info', Resolved: 'ok', Closed: 'done' }[t.status]}`}><i />{t.status}</span></td><td>{fmtDateTime(t.createdAt)}</td><td><div className="adm-actions inline"><button onClick={() => { setView(t.id); setReply(''); }} aria-label="Open"><Eye size={15} /></button></div></td></tr>)}
    </tbody></table>{list.length === 0 && <p className="adm-empty">No tickets found.</p>}</div>
    {open && <Modal wide title={`Ticket ${open.ticketCode}`} kicker={open.category.toUpperCase()} onClose={() => setView(null)}>
      <div className="detail-grid">
        <div className="detail-card"><h4>Customer</h4><div className="kv"><span>Name</span><b>{open.name}</b></div><div className="kv"><span>Phone</span><b>{open.phone || '—'}</b></div><div className="kv"><span>Email</span><b>{open.email || '—'}</b></div>{open.phone && <a className="adm-link" href={wa(open)} target="_blank" rel="noopener noreferrer">Reply on WhatsApp →</a>}</div>
        <div className="detail-card"><h4>Status</h4><div className="kv"><span>Priority</span><b>{open.priority}{open.escalated ? ' · escalated' : ''}</b></div>{open.bookingCode && <div className="kv"><span>Booking</span><b>{open.bookingCode}</b></div>}<div className="kv"><span>Status</span><select className="adm-status" value={open.status} onChange={(e) => patch(open, { status: e.target.value }, 'Ticket updated')}><option>Open</option><option>In progress</option><option>Resolved</option><option>Closed</option></select></div></div>
        {open.appointment && <div className="detail-card span2"><h4>Call appointment</h4><div className="kv"><span>Date</span><b>{fmtDate(open.appointment.date)}</b></div><div className="kv"><span>Time</span><b>{open.appointment.slot}</b></div></div>}
        <div className="detail-card span2"><h4>Problem</h4><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{open.message}</p></div>
        {open.transcript?.length > 0 && <div className="detail-card span2"><h4>Chat transcript</h4>{open.transcript.map((m, i) => <p key={i} style={{ margin: '4px 0', fontSize: 13 }}><b>{m.from === 'user' ? 'Customer' : 'Bot'}:</b> {m.text}</p>)}</div>}
        <div className="detail-card span2"><h4>Replies</h4>{(open.replies || []).map((r, i) => <p key={i} style={{ margin: '4px 0', fontSize: 13 }}><b>{r.from === 'support' ? 'Support' : 'Customer'}</b> · {fmtDateTime(r.at)}<br />{r.text}</p>)}
          <textarea rows={3} style={{ width: '100%', marginTop: 8 }} placeholder="Write a reply (customer sees it in the chatbot → My tickets)" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="form-actions"><button className="btn-primary" disabled={busy || !reply.trim()} onClick={() => patch(open, { reply }, 'Reply sent')}>Send reply</button></div></div>
      </div></Modal>}
  </>;
}
