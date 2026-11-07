import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, BedDouble, CalendarCheck, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, Heart, Hotel, LockKeyhole, LogIn, LogOut, Mail, MapPin, Menu, MoreHorizontal, Phone, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star, Users, Wallet, X } from 'lucide-react';
import { request, TOKEN_KEYS } from './lib/api.js';
import { addDays, initials, money, nightsBetween, roomFreeFor, todayIso } from './lib/utils.js';
import { NotificationsPanel, ProfileDashboard, SettingsPanel } from './AccountPanels.jsx';
import BookingFlow from './BookingFlow.jsx';
import MyBookings from './MyBookings.jsx';
import MovieTickets from './MovieTickets.jsx';
import { FACILITIES, FacilityDetails, facilityForAmenity } from './Facilities.jsx';
import { Modal, StatusPill } from './components.jsx';
import Chatbot, { WhatsAppButton } from './Chatbot.jsx';
import { SUPPORT, telLink, waLink } from './lib/support.js';

const HERO_SLIDES = [
  { src: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2200&q=90', alt: 'Luxury resort pool and hotel' },
  { src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=90', alt: 'Tropical hotel with an outdoor swimming pool' },
  { src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2200&q=90', alt: 'Resort hotel surrounded by greenery' },
  { src: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=2200&q=90', alt: 'Comfortable hotel room with a scenic view' },
  { src: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2200&q=90', alt: 'Palm-lined tropical resort beside a swimming pool' },
  { src: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=2200&q=90', alt: 'Bright boutique hotel room with inviting decor' },
  { src: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=2200&q=90', alt: 'Elegant hotel with an illuminated outdoor pool' },
  { src: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2200&q=90', alt: 'Seaside resort pool overlooking the ocean' },
  { src: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2200&q=90', alt: 'Modern luxury hotel suite with a scenic view' },
  { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=2200&q=90', alt: 'Stylish hotel suite with a spacious living area' },
];

export default function App() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroBlurring, setHeroBlurring] = useState(false);
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('hotelpro_user') || 'null'); } catch { return null; } });
  const [authReady, setAuthReady] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [page, setPage] = useState('Discover');
  const [hotelId, setHotelId] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All stays');
  const [sort, setSort] = useState('Recommended');
  const [checkIn, setCheckIn] = useState(() => addDays(todayIso(), 3));
  const [checkOut, setCheckOut] = useState(() => addDays(todayIso(), 6));
  const [guests, setGuests] = useState(2);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => { try { const s = JSON.parse(localStorage.getItem('hotelpro_notifications') || '[]'); return Array.isArray(s) ? s.filter((n) => n.type === 'hotel' || n.type === 'room' || n.type?.startsWith('booking_')) : []; } catch { return []; } });
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('hotelpro_saved') || '[]'); } catch { return []; } });
  const [compareIds, setCompareIds] = useState(() => { try { const ids = JSON.parse(localStorage.getItem('hotelpro_compare') || '[]'); return Array.isArray(ids) ? [...new Set(ids)].slice(0, 3) : []; } catch { return []; } });
  const [compareOpen, setCompareOpen] = useState(false);
  const [auth, setAuth] = useState(null); // {mode, notice}
  const [bookRoom, setBookRoom] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [facilityOpen, setFacilityOpen] = useState(null);
  const [movieBooking, setMovieBooking] = useState(null);
  const visibleNotifications = notifications.filter((notification) => !notification.details?.userId || notification.details.userId === user?.id);

  useEffect(() => {
    let active = true;
    async function restoreCustomerSession() {
      if (!localStorage.getItem(TOKEN_KEYS.guest)) {
        localStorage.removeItem('hotelpro_user');
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const { user: authenticatedUser } = await request('/auth/me');
        if (!active) return;
        if (!authenticatedUser) throw new Error('The server did not return an account.');
        localStorage.setItem('hotelpro_user', JSON.stringify(authenticatedUser));
        setUser(authenticatedUser);
      } catch (error) {
        if (!active) return;
        if (error.status === 401) {
          localStorage.removeItem(TOKEN_KEYS.guest);
          localStorage.removeItem('hotelpro_user');
          setUser(null);
          setBookings([]);
        } else {
          setToast(`Could not verify your account: ${error.message}`);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    }
    restoreCustomerSession();
    return () => { active = false; };
  }, []);

  useEffect(() => { localStorage.setItem('hotelpro_saved', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem('hotelpro_compare', JSON.stringify(compareIds)); }, [compareIds]);
  useEffect(() => { localStorage.setItem('hotelpro_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => {
    let active = true;
    let reportedError = false;
    async function checkUpdates() {
      try {
        const { updates } = await request(`/updates?date=${todayIso()}`);
        if (!active) return;
        reportedError = false;
        const cursorKey = `hotelpro_updates_cursor_${user?.id || 'public'}`;
        const cursor = localStorage.getItem(cursorKey);
        const latestUpdate = updates[0]?.createdAt;
        if (!cursor) {
          const now = new Date().toISOString();
          const cutoff = Date.now() - 7 * 86400000;
          const recentBookings = updates.filter((item) => item.details?.userId === user?.id && (item.type === 'booking_reminder' || new Date(item.createdAt).getTime() >= cutoff));
          if (recentBookings.length) {
            setNotifications((current) => {
              const existing = new Set(current.map((item) => item.id));
              const added = recentBookings.filter((item) => !existing.has(item.id)).map((item) => ({ ...item, read: false }));
              return [...added, ...current].slice(0, 20);
            });
          }
          localStorage.setItem(cursorKey, latestUpdate && latestUpdate > now ? latestUpdate : now);
          return;
        }
        const incoming = updates.filter((item) => item.createdAt > cursor);
        if (incoming.length) {
          setNotifications((current) => {
            const existing = new Set(current.map((item) => item.id));
            const added = incoming.filter((item) => !existing.has(item.id)).map((item) => ({ ...item, read: false }));
            return [...added, ...current].slice(0, 20);
          });
        }
        if (latestUpdate && latestUpdate > cursor) localStorage.setItem(cursorKey, latestUpdate);
      } catch (error) {
        if (active && !reportedError) {
          setToast(`Could not check hotel updates: ${error.message}`);
          reportedError = true;
        }
      }
    }
    checkUpdates();
    const interval = setInterval(checkUpdates, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.id]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    let blurTimer;
    let nextTimer;
    const blurBeforeChange = () => {
      setHeroBlurring(true);
      blurTimer = setTimeout(() => {
        setHeroIndex((index) => (index + 1) % HERO_SLIDES.length);
        setHeroBlurring(false);
        nextTimer = setTimeout(blurBeforeChange, 1900);
      }, 600);
    };
    nextTimer = setTimeout(blurBeforeChange, 1900);
    return () => {
      clearTimeout(blurTimer);
      clearTimeout(nextTimer);
    };
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([request('/hotels'), request('/rooms')]);
      setHotels(h.hotels); setRooms(r.rooms); setCatalogError('');
    } catch (e) { setCatalogError(e.message); } finally { setLoadingCatalog(false); }
  }, []);
  const loadBookings = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEYS.guest)) { setBookings([]); return; }
    setLoadingBookings(true);
    try { setBookings((await request('/bookings')).bookings); }
    catch (e) { if (e.status === 401) signOut(true); } finally { setLoadingBookings(false); }
  }, []); // eslint-disable-line
  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { if (authReady) loadBookings(); }, [authReady, user, loadBookings]);

  const go = (p) => { setPage(p); setMobileNav(false); setProfileOpen(false); window.scrollTo?.({ top: 0 }); };
  function signOut(silent) {
    localStorage.removeItem(TOKEN_KEYS.guest); localStorage.removeItem('hotelpro_user');
    setUser(null); setBookings([]); setProfileOpen(false); if (silent !== true) { setToast('You have been signed out.'); go('Discover'); }
  }
  function onAuthed(data, registering) {
    localStorage.setItem(TOKEN_KEYS.guest, data.token); localStorage.setItem('hotelpro_user', JSON.stringify(data.user));
    setUser(data.user); setAuth(null);
    setToast(registering ? `Welcome to HotelPro, ${data.user.name}.` : `Welcome back, ${data.user.name}.`);
    if (pendingRoom) { setBookRoom(pendingRoom); setPendingRoom(null); }
  }
  function startBooking(room) {
    if (!user) { setPendingRoom(room); setAuth({ mode: 'signin', notice: 'Please sign in or create an account to book your stay.' }); return; }
    setBookRoom(room);
  }
  function bookingDone() { loadBookings(); loadCatalog(); }

  const hotelById = useMemo(() => Object.fromEntries(hotels.map((h) => [h.id, h])), [hotels]);
  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = nights > 0;
  const availableRoomsByHotel = useMemo(() => Object.fromEntries(hotels.map((h) => [
    h.id,
    rooms.filter((room) => room.hotelId === h.id && room.capacity >= guests && (!datesValid || roomFreeFor(room, checkIn, checkOut))),
  ])), [hotels, rooms, guests, datesValid, checkIn, checkOut]);
  useEffect(() => {
    if (!loadingCatalog && !catalogError) setCompareIds((ids) => ids.filter((id) => hotelById[id]));
  }, [loadingCatalog, catalogError, hotelById]);

  const visibleHotels = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = hotels.filter((h) => {
      if (q && !`${h.name} ${h.city} ${h.country} ${h.address}`.toLowerCase().includes(q)) return false;
      if (!availableRoomsByHotel[h.id]?.length) return false;
      return true;
    });
    if (sort === 'Price: low to high') list = [...list].sort((a, b) => {
      const aPrice = Math.min(...(availableRoomsByHotel[a.id] || []).map((room) => room.price));
      const bPrice = Math.min(...(availableRoomsByHotel[b.id] || []).map((room) => room.price));
      return aPrice - bPrice;
    });
    if (sort === 'Top rated') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [hotels, availableRoomsByHotel, query, sort]);

  const hotel = hotelById[hotelId];
  const hotelRooms = useMemo(() => {
    let list = availableRoomsByHotel[hotelId] || [];
    if (typeFilter !== 'All stays') list = list.filter((r) => r.type === typeFilter);
    if (sort === 'Price: low to high') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Top rated') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [availableRoomsByHotel, hotelId, typeFilter, sort]);
  const roomTypes = useMemo(() => ['All stays', ...Array.from(new Set(rooms.filter((r) => r.hotelId === hotelId).map((r) => r.type)))], [rooms, hotelId]);
  const savedRooms = rooms.filter((r) => saved.includes(r.id));
  const comparedHotels = compareIds.map((id) => hotelById[id]).filter(Boolean);
  const toggleSave = (id) => setSaved((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleCompare = (id) => {
    if (compareIds.includes(id)) {
      setCompareIds((current) => current.filter((item) => item !== id));
      return;
    }
    if (compareIds.length >= 3) {
      setToast('Compare up to 3 hotels at a time.');
      return;
    }
    setCompareIds((current) => current.length < 3 ? [...current, id] : current);
  };
  const chooseDestination = (city) => {
    setQuery(city);
    go('Discover');
    setTimeout(() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const destinationHighlights = useMemo(() => {
    const destinations = new Map();
    hotels.forEach((h) => {
      const current = destinations.get(h.city) || { city: h.city, country: h.country, count: 0, image: h.image, rating: 0 };
      const available = rooms.filter((r) => r.hotelId === h.id && r.capacity >= guests && (!datesValid || roomFreeFor(r, checkIn, checkOut))).length;
      current.count += available ? 1 : 0;
      current.rating = Math.max(current.rating, h.rating || 0);
      if (!current.image && h.image) current.image = h.image;
      destinations.set(h.city, current);
    });
    return [...destinations.values()].filter((d) => d.count > 0).sort((a, b) => b.count - a.count || b.rating - a.rating);
  }, [hotels, rooms, guests, datesValid, checkIn, checkOut]);
  const upcomingCount = bookings.filter((b) => ['Confirmed', 'Checked-in'].includes(b.status)).length;
  const openHotel = (id) => { setHotelId(id); setTypeFilter('All stays'); go('Hotel'); };

  const navItems = [{ name: 'Discover', icon: Compass }, { name: 'My bookings', icon: CalendarCheck }, { name: 'Saved stays', icon: Heart }];
  const crumb = page === 'Hotel' ? hotel?.name || 'Hotel' : page;

  const searchBar = (
    <section className="search-panel">
      <div className="search-field destination-field"><MapPin size={19} /><div><label>DESTINATION</label><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City or hotel name" /></div></div><div className="search-separator" />
      <div className="search-field"><CalendarDays size={19} /><div><label>CHECK IN</label><input type="date" min={todayIso()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} /></div></div><div className="search-separator" />
      <div className="search-field"><CalendarDays size={19} /><div><label>CHECK OUT</label><input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div></div><div className="search-separator" />
      <div className="search-field guest-field"><Users size={19} /><div><label>GUESTS</label><select value={guests} onChange={(e) => setGuests(+e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></div></div>
      <button className="search-submit" aria-label="Search" onClick={() => { if (page === 'Hotel') { go('Discover'); setTimeout(() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' }), 50); } else if (page === 'Discover') document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' }); }}><Search size={19} /></button>
    </section>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Hotel size={21} /></div><div><span className="brand-name">hotelpro<span>.</span></span><small>STAYS, REIMAGINED</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">YOUR SPACE</div>
        <nav>{navItems.map((n) => <button key={n.name} className={`nav-item ${page === n.name || (n.name === 'Discover' && page === 'Hotel') ? 'active' : ''}`} onClick={() => go(n.name)}><n.icon size={18} /><span>{n.name}</span>{n.name === 'My bookings' && upcomingCount > 0 && <b className="nav-count">{upcomingCount}</b>}{n.name === 'Saved stays' && saved.length > 0 && <b className="nav-count">{saved.length}</b>}</button>)}</nav>
        <div className="sidebar-bottom">
          <button className={`nav-item settings-link ${page === 'Settings' ? 'active' : ''}`} onClick={() => go('Settings')}><Settings size={18} /><span>Settings</span></button>
          <div className="sidebar-support">
            <WhatsAppButton user={user} className="wa-sidebar" />
            <a className="sidebar-helpline" href={telLink()} aria-label={`Call administrator helpline at ${SUPPORT.phone}`} title={`Call administrator helpline: ${SUPPORT.phone}`}>
              <Phone size={17} />
              <span><strong>Administrator helpline</strong><small>{SUPPORT.phone} · Call us</small></span>
            </a>
          </div>
          <div className="user-card">
            <button className="avatar profile-trigger" onClick={() => go('Profile')} aria-label="Open profile">{initials(user?.name || 'Guest')}</button>
            <button className="user-details profile-user-trigger" onClick={() => go('Profile')}><strong>{user?.name || 'Guest'}</strong><small>{user?.email || 'Not signed in'}</small></button>
            <button className="icon-btn" aria-label="Account menu" onClick={() => setProfileOpen(!profileOpen)}><MoreHorizontal size={19} /></button>
            {profileOpen && <div className="profile-menu">{user ? <><button onClick={() => go('Profile')}><Users size={15} /> My profile</button><button onClick={() => go('My bookings')}><CalendarCheck size={15} /> My bookings</button><button onClick={() => signOut()}><LogOut size={15} /> Sign out</button></> : <button onClick={() => { setProfileOpen(false); setAuth({ mode: 'signin' }); }}><LogIn size={15} /> Sign in</button>}</div>}
          </div>
        </div>
      </aside>
      {mobileNav && <div className="mobile-overlay" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn menu-toggle" onClick={() => setMobileNav(true)} aria-label="Menu"><Menu size={20} /></button><span className="breadcrumb">HotelPro <ChevronRight size={14} /> <strong>{crumb}</strong></span></div>
          <div className="topbar-right">
            {!user ? <><button className="sign-in-btn" onClick={() => setAuth({ mode: 'signin' })}><LogIn size={15} /> Sign in</button><button className="sign-up-btn" onClick={() => setAuth({ mode: 'register' })}>Create account</button></> : <button className="sign-in-btn" onClick={() => signOut()}><LogOut size={15} /> Sign out</button>}
            <button className="icon-btn notification" aria-label="Notifications" onClick={() => setNotificationsOpen((o) => !o)}><Bell size={19} />{visibleNotifications.some((n) => !n.read) && <i />}</button>
            <button className="top-avatar top-profile-trigger" onClick={() => go('Profile')} aria-label="Profile">{initials(user?.name || 'Guest')}</button>
          </div>
          {notificationsOpen && <NotificationsPanel notifications={visibleNotifications} onClose={() => setNotificationsOpen(false)} onMarkRead={() => setNotifications((p) => p.map((n) => !n.details?.userId || n.details.userId === user?.id ? { ...n, read: true } : n))} onNavigate={(p) => { go(p); setNotificationsOpen(false); }} />}
        </header>

        {catalogError && <div className="top-alert">{catalogError} <button onClick={loadCatalog}>Retry</button></div>}

        {page === 'Discover' && <>
          <section className={`hero${heroBlurring ? ' hero-blurring' : ''}`} aria-label="Featured hotel photography">
            <img className="hero-slide" src={HERO_SLIDES[heroIndex].src} alt={HERO_SLIDES[heroIndex].alt} />
            <div className="hero-shade" />
            <div className="hero-content"><div className="eyebrow"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</div><h1>Stay somewhere<br /><em>special.</em></h1><p>Thoughtful spaces. Unforgettable moments.<br />Find a stay that feels like you.</p><button className="hero-cta" onClick={() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })}>Explore hotels <ArrowRight size={16} /></button></div>
          </section>
          {searchBar}
          <section className="content-section" id="stays">
            <div className="section-heading"><div><div className="section-kicker">MADE FOR YOUR KIND OF GETAWAY</div><h2>Find your <em>perfect hotel</em></h2><p>{datesValid ? `${nights} night${nights > 1 ? 's' : ''} · ${guests} guest${guests > 1 ? 's' : ''} · ${visibleHotels.length} hotel${visibleHotels.length === 1 ? '' : 's'} available` : 'Choose valid dates to see availability.'}</p></div>
              <label className="sort-select"><SlidersHorizontal size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Top rated</option></select><ChevronDown size={14} /></label></div>
            {compareIds.length > 0 && <div className="compare-bar"><div><strong>Compare your shortlist</strong><span>{compareIds.length < 2 ? 'Select one more hotel to compare.' : `${compareIds.length} hotels selected.`}</span></div><div><button className="compare-action" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>Compare hotels <ArrowRight size={15} /></button><button className="compare-clear" onClick={() => setCompareIds([])}>Clear</button></div></div>}
            {loadingCatalog ? <div className="empty-state"><h3>Loading hotels…</h3></div> :
              <div className="room-grid hotel-grid">{visibleHotels.map((h) => (
                <article className="room-card" key={h.id}>
                  <div className="room-image-wrap"><img className="room-image" src={h.image} alt={h.name} /><span className="room-tag">{'★'.repeat(h.stars)} {h.stars}-STAR</span><button type="button" className={`hotel-compare-btn ${compareIds.includes(h.id) ? 'selected' : ''}`} onClick={() => toggleCompare(h.id)} aria-pressed={compareIds.includes(h.id)}>{compareIds.includes(h.id) && <Check size={14} />}{compareIds.includes(h.id) ? 'Added' : 'Compare'}</button></div>
                  <div className="room-info">
                    <div className="room-title-line"><div><h3>{h.name}</h3><span className="room-subtitle"><MapPin size={12} /> {h.city}, {h.country}</span></div><div className="rating"><Star size={14} fill="currentColor" /> {h.rating}</div></div>
                    <p className="room-desc">{h.description}</p>
                    <div className="hotel-facility-preview" aria-label="Hotel facilities">
                      {(h.amenities || []).slice(0, 4).map((amenity) => <span key={amenity}><Check size={12} />{amenity}</span>)}
                      {(h.amenities || []).length > 4 && <span className="facility-more">+{h.amenities.length - 4} more</span>}
                    </div>
                    <div className="room-card-bottom"><div><small>{availableRoomsByHotel[h.id]?.length || 0} rooms · from </small><strong>{money(Math.min(...(availableRoomsByHotel[h.id] || []).map((room) => room.price)))}</strong><span> / night</span></div><button className="view-room" onClick={() => openHotel(h.id)}>View rooms <ArrowRight size={15} /></button></div>
                  </div>
                </article>))}</div>}
            {!loadingCatalog && visibleHotels.length === 0 && <div className="empty-state"><Search size={28} /><h3>No hotels found</h3><p>Try another destination, different dates or fewer guests.</p><button onClick={() => { setQuery(''); setGuests(1); }}>Clear filters</button></div>}
            <div className="trust-strip"><div><ShieldCheck size={21} /><span><strong>Secure booking</strong><small>Your details stay protected</small></span></div><div><Wallet size={21} /><span><strong>Flexible payments</strong><small>Card, UPI, net banking or pay at hotel</small></span></div><div><Clock3 size={21} /><span><strong>Free cancellation</strong><small>Cancel anytime from My bookings</small></span></div><div><Sparkles size={21} /><span><strong>Handpicked quality</strong><small>Every detail considered</small></span></div></div>
            {destinationHighlights.length > 0 && <section className="inspiration-section" aria-labelledby="inspiration-title">
              <div className="section-heading"><div><div className="section-kicker">A LITTLE INSPIRATION</div><h2 id="inspiration-title">Where will you <em>go next?</em></h2><p>Explore destinations with stays available for your selected dates and guests.</p></div></div>
              <div className="destination-grid">{destinationHighlights.map((destination) => <article className="destination-card" key={destination.city}>
                <img src={destination.image || HERO_SLIDES[0].src} alt={`${destination.city} destination`} loading="lazy" />
                <div className="destination-shade" />
                <div className="destination-copy"><span>{destination.country}</span><h3>{destination.city}</h3><p>{destination.count} hotel{destination.count === 1 ? '' : 's'} with matching rooms</p><button onClick={() => chooseDestination(destination.city)}>Explore stays <ArrowRight size={15} /></button></div>
              </article>)}</div>
            </section>}
          </section></>}
          {page === 'Discover' && <>
          <section className="homepage-facilities" aria-labelledby="homepage-facilities-title">
            <div className="homepage-facilities-heading">
              <span className="section-kicker">COMFORT, YOUR WAY</span>
              <h2 id="homepage-facilities-title">Little extras. <em>Lovely stays.</em></h2>
              <p>From slow mornings to time to unwind, find a hotel with the facilities that make your trip feel just right.</p>
              <button className="extras-cta" onClick={() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })}>Explore available stays <ArrowRight size={15} /></button>
            </div>
            <div className="homepage-facilities-grid">
              {FACILITIES.map(({ id, title, eyebrow, Icon, image, alt, description }) => (
                <button type="button" className="facility-card" key={id} onClick={() => setFacilityOpen({ facility: FACILITIES.find((item) => item.id === id), hotelId: null })}>
                  <img src={image} alt={alt} loading="lazy" />
                  <span className="facility-card-shade" />
                  <span className="facility-card-icon"><Icon size={20} /></span>
                  <small>{eyebrow}</small><strong>{title}</strong><span className="facility-card-description">{description}</span>
                  <span className="facility-card-action">Explore facility <ArrowRight size={14} /></span>
                </button>
              ))}
            </div>
            <p className="homepage-facilities-note"><Check size={14} /> Open any facility to see its photo, details, matching hotels and available booking options.</p>
          </section>
          <section className="about-hotelpro" aria-labelledby="about-hotelpro-title">
            <img src="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=2000&q=85" alt="Elegant hotel interior with welcoming guest spaces" loading="lazy" />
            <div className="about-hotelpro-shade" />
            <div className="about-hotelpro-copy">
              <span className="about-hotelpro-kicker"><Hotel size={14} /> ABOUT HOTELPRO</span>
              <h2 id="about-hotelpro-title">Travel well.<br /><em>Feel at home.</em></h2>
              <p>At HotelPro, we believe a great trip starts with the right place to stay. We bring carefully selected hotels, clear property details, and a simple booking experience together, so you can choose with confidence.</p>
              <p>Whether you are planning a coastal escape, a city visit, or a quiet weekend away, explore welcoming spaces and thoughtful comforts for every kind of journey. Your next memorable stay starts with finding the place that feels right for you.</p>
              <button onClick={() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })}>Discover your stay <ArrowRight size={16} /></button>
            </div>
            <div className="about-hotelpro-note"><Sparkles size={15} /> Thoughtful spaces. Unforgettable moments.</div>
          </section>
          </>}

        {page === 'Hotel' && (hotel ? <>
          <section className="hero hotel-hero"><img src={hotel.image} alt={hotel.name} /><div className="hero-shade" /><div className="hero-content"><button className="back-link" onClick={() => go('Discover')}><ArrowLeft size={15} /> All hotels</button><div className="eyebrow"><MapPin size={14} /> {hotel.city.toUpperCase()}, {hotel.country.toUpperCase()}</div><h1>{hotel.name}</h1><p>{hotel.address}<br /><Star size={13} fill="currentColor" /> {hotel.rating} ({hotel.reviews} reviews) · {'★'.repeat(hotel.stars)}</p></div></section>
          {searchBar}
          <section className="content-section">
            <div className="hotel-about">
              <p>{hotel.description}</p>
              <div className="hotel-facilities">
                <h3>Available facilities</h3>
                <div className="chip-row big" aria-label={`${hotel.name} facilities`}>{(hotel.amenities || []).map((amenity) => <button type="button" className="facility-chip" key={amenity} onClick={() => setFacilityOpen({ facility: facilityForAmenity(amenity), hotelId: hotel.id })}><Check size={13} /> {amenity}<ArrowRight size={12} /></button>)}</div>
              </div>
            </div>
            <div className="section-heading"><div><div className="section-kicker">CHOOSE YOUR ROOM</div><h2>Available <em>rooms</em></h2><p>{datesValid ? `${fmtRange(checkIn, checkOut)} · ${nights} night${nights > 1 ? 's' : ''}` : 'Choose valid dates to check availability.'}</p></div>
              <label className="sort-select"><SlidersHorizontal size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Top rated</option></select><ChevronDown size={14} /></label></div>
            <div className="type-filters filter-row">{roomTypes.map((t) => <button key={t} className={typeFilter === t ? 'filter-active' : ''} onClick={() => setTypeFilter(t)}>{t}</button>)}</div>
            <div className="room-grid">{hotelRooms.map((room) => {
              const free = datesValid && roomFreeFor(room, checkIn, checkOut);
              return (
                <article className={`room-card ${free ? '' : 'room-unavailable'}`} key={room.id}>
                  <div className="room-image-wrap"><img className="room-image" src={room.image} alt={room.name} />{room.tag && <span className="room-tag">{room.tag}</span>}<button className={`save-btn ${saved.includes(room.id) ? 'saved' : ''}`} aria-label="Save room" onClick={() => toggleSave(room.id)}><Heart size={18} fill={saved.includes(room.id) ? 'currentColor' : 'none'} /></button>{!free && <span className="sold-out">{room.status !== 'Available' ? 'Not available' : 'Booked for these dates'}</span>}</div>
                  <div className="room-info">
                    <div className="room-title-line"><div><h3>{room.name}</h3><span className="room-subtitle">{room.type} · {room.size}</span></div><div className="rating"><Star size={14} fill="currentColor" /> {room.rating}</div></div>
                    <p className="room-desc">{room.description}</p>
                    <div className="room-features"><span><BedDouble size={15} />{room.beds}</span><span><Users size={15} />Up to {room.capacity}</span></div>
                    <div className="chip-row">{(room.amenities || []).slice(0, 4).map((a) => <span key={a}>{a}</span>)}</div>
                    <div className="room-card-bottom"><div><strong>{money(room.price)}</strong><span> / night</span></div><button className="book-btn" disabled={!free} onClick={() => startBooking(room)}>{free ? <>Book now <ArrowRight size={15} /></> : 'Unavailable'}</button></div>
                  </div>
                </article>);
            })}</div>
            {hotelRooms.length === 0 && <div className="empty-state"><BedDouble size={28} /><h3>No rooms available for this hotel</h3><p>Try different dates, fewer guests or another room type.</p><button onClick={() => { setTypeFilter('All stays'); setGuests(1); setCheckIn(addDays(todayIso(), 3)); setCheckOut(addDays(todayIso(), 6)); }}>Reset room search</button></div>}
          </section></> : <section className="page-content"><div className="empty-state"><h3>Hotel not found</h3><button onClick={() => go('Discover')}>Back to hotels</button></div></section>)}

        {page === 'My bookings' && (user ? <MyBookings bookings={bookings} loading={loadingBookings} setPage={go} onChanged={async () => { await loadBookings(); await loadCatalog(); }} toast={setToast} /> :
          <section className="page-content"><div className="empty-state"><LockKeyhole size={30} /><h3>Sign in to see your bookings</h3><p>Your reservations are saved to your HotelPro account.</p><button onClick={() => setAuth({ mode: 'signin' })}>Sign in <ArrowRight size={15} /></button></div></section>)}

        {page === 'Saved stays' && <section className="page-content"><div className="section-kicker">YOUR SHORTLIST</div><h2>Saved <em>stays</em></h2><p className="page-lead">All the rooms you’ve had your eye on.</p>
          <div className="room-grid saved-grid">{savedRooms.map((r) => <article className="room-card" key={r.id}><div className="room-image-wrap"><img className="room-image" src={r.image} alt={r.name} /><button className="save-btn saved" onClick={() => toggleSave(r.id)} aria-label="Remove"><Heart size={18} fill="currentColor" /></button></div><div className="room-info"><h3>{r.name}</h3><span className="room-subtitle">{hotelById[r.hotelId]?.name} · {r.type}</span><div className="room-card-bottom"><strong>{money(r.price)} <small>/ night</small></strong><button className="view-room" onClick={() => openHotel(r.hotelId)}>View hotel <ArrowRight size={15} /></button></div></div></article>)}</div>
          {savedRooms.length === 0 && <div className="empty-state"><Heart size={28} /><h3>Your wishlist is waiting</h3><p>Tap the heart on any room to keep it close.</p><button onClick={() => go('Discover')}>Explore stays <ArrowRight size={15} /></button></div>}</section>}

        {page === 'Profile' && <ProfileDashboard user={user} bookings={bookings} savedRooms={savedRooms} onNavigate={go} onSignIn={() => setAuth({ mode: 'signin' })} />}
        {page === 'Settings' && <SettingsPanel user={user} onSignIn={() => setAuth({ mode: 'signin' })} onSignOut={() => signOut()} onToast={setToast} />}

        <footer className="footer">
          <div className="footer-main">
            <div className="footer-intro">
              <button className="footer-brand" onClick={() => go('Discover')} aria-label="HotelPro home">
                <span className="brand-mark"><Hotel size={18} /></span><span>hotelpro<span>.</span></span>
              </button>
              <p>Thoughtful stays for the moments that matter. Find a place that feels like you.</p>
              <span className="footer-promise"><Sparkles size={14} /> Thoughtful spaces. Unforgettable moments.</span>
            </div>
            <div className="footer-links">
              <h3>Explore</h3>
              <button onClick={() => go('Discover')}>Browse stays <ArrowRight size={14} /></button>
              <button onClick={() => go('Saved stays')}>Your saved stays <ArrowRight size={14} /></button>
              <button onClick={() => go('My bookings')}>My bookings <ArrowRight size={14} /></button>
            </div>
            <div className="footer-support">
              <h3>We’re here to help</h3>
              <p>Questions about your next getaway? Our team is happy to help.</p>
              <button onClick={() => window.open(waLink(), '_blank', 'noopener')}><CircleHelp size={16} /> Chat with our team</button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} HotelPro Hospitality</span>
            <span>Made for better moments, wherever you’re headed.</span>
          </div>
        </footer>
      </main>

      {bookRoom && <BookingFlow room={bookRoom} hotel={hotelById[bookRoom.hotelId]} user={user} dates={{ checkIn, checkOut, guests }} onClose={() => setBookRoom(null)} onDone={(b) => { bookingDone(b); go('My bookings'); }} />}
      {facilityOpen && <FacilityDetails
        facility={facilityOpen.facility}
        hotels={facilityOpen.hotelId && hotelById[facilityOpen.hotelId] ? [hotelById[facilityOpen.hotelId]] : hotels}
        bookings={bookings}
        user={user}
        onClose={() => setFacilityOpen(null)}
        onViewHotel={(id) => { setFacilityOpen(null); openHotel(id); }}
        onSignIn={() => { setFacilityOpen(null); setAuth({ mode: 'signin', notice: 'Sign in to reserve hotel facilities.' }); }}
        onBookMovies={(booking) => { setFacilityOpen(null); setMovieBooking(booking); }}
        toast={setToast}
      />}
      {movieBooking && <MovieTickets booking={movieBooking} onClose={() => setMovieBooking(null)} toast={setToast} />}
      {auth && <AuthModal mode={auth.mode} notice={auth.notice} onClose={() => { setAuth(null); setPendingRoom(null); }} onAuthed={onAuthed} />}
      {compareOpen && comparedHotels.length > 1 && <Modal title="Compare your stays" kicker="YOUR SHORTLIST" onClose={() => setCompareOpen(false)} wide>
        <div className="compare-table-wrap"><table className="compare-table">
          <thead><tr><th scope="col">Hotel details</th>{comparedHotels.map((h) => <th scope="col" key={h.id}><strong>{h.name}</strong><small>{h.city}, {h.country}</small><button onClick={() => { setCompareOpen(false); openHotel(h.id); }} className="compare-view">View rooms <ArrowRight size={13} /></button></th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Category</th>{comparedHotels.map((h) => <td key={h.id}>{h.stars} star{h.stars === 1 ? '' : 's'}</td>)}</tr>
            <tr><th scope="row">Guest rating</th>{comparedHotels.map((h) => <td key={h.id}><Star size={14} fill="currentColor" /> {h.rating} <small>({h.reviews} reviews)</small></td>)}</tr>
            <tr><th scope="row">Starting price</th>{comparedHotels.map((h) => <td key={h.id}>{h.fromPrice != null ? <><strong>{money(h.fromPrice)}</strong> / night</> : 'No rooms yet'}</td>)}</tr>
            <tr><th scope="row">Rooms for your trip</th>{comparedHotels.map((h) => {
              const count = rooms.filter((r) => r.hotelId === h.id && r.capacity >= guests && (!datesValid || roomFreeFor(r, checkIn, checkOut))).length;
              return <td key={h.id}>{datesValid ? `${count} available` : 'Choose dates to check'}</td>;
            })}</tr>
            <tr><th scope="row">Amenities</th>{comparedHotels.map((h) => <td key={h.id}><div className="compare-amenities">{(h.amenities || []).slice(0, 5).map((amenity) => <span key={amenity}>{amenity}</span>)}</div></td>)}</tr>
          </tbody>
        </table></div>
      </Modal>}
      <Chatbot user={user} hotels={hotels} rooms={rooms} bookings={bookings} dates={{ checkIn, checkOut, guests }}
        onSetDates={(a, b, c) => { setCheckIn(a); setCheckOut(b); setGuests(c); }} onBook={startBooking}
        onSignIn={() => setAuth({ mode: 'signin' })} onBookingsChanged={() => { loadBookings(); loadCatalog(); }} onGo={go} />
      {toast && <div className="toast"><span className="toast-check"><Check size={16} /></span>{toast}<button onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  );
}
const fmtRange = (a, b) => `${new Date(a + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(b + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

export function AuthModal({ mode: initial, notice, onClose, onAuthed }) {
  const [mode, setMode] = useState(initial);
  const [role, setRole] = useState('guest'); // 'guest' | 'admin'
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdminLogin = role === 'admin' && mode !== 'register';
  const registering = mode === 'register';
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (isAdminLogin) {
        const d = await request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ email: f.email, password: f.password }) }, 'admin');
        localStorage.setItem(TOKEN_KEYS.admin, d.token);
        window.location.assign('/admin'); // admin panel opens already signed in
        return;
      }
      const data = await request(`/auth/${registering ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(registering ? { name: f.name, email: f.email, phone: f.phone, password: f.password } : { email: f.email, password: f.password }) });
      onAuthed(data, registering);
    } catch (x) { setError(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="login-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="login-photo"><img src={HERO_SLIDES[0].src} alt="A peaceful luxury hotel resort" /><div className="login-photo-shade" /><div className="login-photo-brand"><span className="login-brand-mark"><Hotel size={19} /></span><span>hotelpro<span>.</span></span></div><div className="login-photo-copy"><span>THE ART OF GETTING AWAY</span><h2>A little more<br />room to <em>unwind.</em></h2><p>Come back to the places that make every journey feel special.</p></div></div>
        <div className="login-form-panel">
          <button type="button" className="login-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
          <div className="login-form-content">
            <div className="login-kicker">{registering ? 'JOIN HOTELPRO' : isAdminLogin ? 'STAFF ACCESS' : 'WELCOME BACK'}</div>
            <h2 id="login-title">{registering ? 'Create your account' : isAdminLogin ? 'Admin sign in' : 'Guest sign in'}</h2>
            <p className="login-intro">{isAdminLogin ? 'Sign in with the administrator account to manage hotels, rooms and bookings.' : (notice || (registering ? 'Create an account to book stays and manage reservations.' : 'Sign in to book and manage your stays.'))}</p>
            {!registering && <div className="login-role-tabs" role="tablist"><button type="button" role="tab" aria-selected={role === 'guest'} className={role === 'guest' ? 'active' : ''} onClick={() => { setRole('guest'); setError(''); }}><Users size={15} /> Customer</button><button type="button" role="tab" aria-selected={role === 'admin'} className={role === 'admin' ? 'active' : ''} onClick={() => { setRole('admin'); setError(''); }}><ShieldCheck size={15} /> Admin</button></div>}
            <form className="login-form" onSubmit={submit}>
              {registering && <><label htmlFor="a-name">FULL NAME</label><div className="login-input-wrap"><Users size={17} /><input id="a-name" autoComplete="name" placeholder="Your name" value={f.name} onChange={set('name')} maxLength={120} required /></div></>}
              <label htmlFor="a-email">EMAIL ADDRESS</label><div className="login-input-wrap"><Mail size={17} /><input id="a-email" type="email" autoComplete="email" placeholder={isAdminLogin ? 'admin@hotelpro.com' : 'you@example.com'} value={f.email} onChange={set('email')} required /></div>
              {registering && <><label htmlFor="a-phone">PHONE (OPTIONAL)</label><div className="login-input-wrap"><Phone size={17} /><input id="a-phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={f.phone} onChange={set('phone')} /></div></>}
              <label htmlFor="a-pass">PASSWORD</label><div className="login-input-wrap"><LockKeyhole size={17} /><input id="a-pass" type="password" autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'At least 8 characters' : 'Enter your password'} value={f.password} onChange={set('password')} minLength={registering ? 8 : undefined} maxLength={128} required /></div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : <>{registering ? 'Create account' : isAdminLogin ? 'Sign in as admin' : 'Sign in'} <ArrowRight size={16} /></>}</button>
            </form>
            {!isAdminLogin && <div className="login-switch">{registering ? 'Already have an account?' : 'New to HotelPro?'} <button type="button" onClick={() => { setMode(registering ? 'signin' : 'register'); setError(''); }}>{registering ? 'Sign in' : 'Create account'}</button></div>}
          </div>
        </div>
      </section>
    </div>
  );
}
