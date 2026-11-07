import {useEffect, useState} from 'react';
import {ArrowRight, Bell, CalendarCheck, Check, ChevronRight, Heart, Mail, MapPin, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, Users, X} from 'lucide-react';
import './account-panels.css';

const defaultPreferences = {
  bookingReminders: true,
  emailUpdates: true,
  productNews: false
};

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem('hotelpro_settings') || 'null');
    return stored && typeof stored === 'object'
      ? {...defaultPreferences, ...stored}
      : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function SettingsPanel({user, onSignIn, onSignOut, onToast}) {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    localStorage.setItem('hotelpro_settings', JSON.stringify(preferences));
  }, [preferences]);

  function updatePreference(key) {
    setPreferences(previous => ({...previous, [key]: !previous[key]}));
    onToast('Your preferences have been saved.');
  }

  return (
    <section className="page-content account-settings">
      <div className="section-kicker">MAKE IT YOURS</div>
      <h2>Account <em>settings</em></h2>
      <p className="page-lead">Manage your account and choose the updates you receive.</p>

      <div className="settings-grid">
        <section className="account-panel">
          <div className="account-panel-heading">
            <span className="account-panel-icon"><UserRound size={18}/></span>
            <div><h3>Your account</h3><p>Your HotelPro profile</p></div>
          </div>
          <div className="account-detail">
            <span>Name</span>
            <strong>{user?.name || 'Demo guest'}</strong>
          </div>
          <div className="account-detail">
            <span>Email address</span>
            <strong>{user?.email || 'Not signed in'}</strong>
          </div>
          {user
            ? <button className="settings-action settings-signout" onClick={onSignOut}>Sign out <ChevronRight size={15}/></button>
            : <button className="settings-action" onClick={onSignIn}>Sign in to your account <ChevronRight size={15}/></button>}
        </section>

        <section className="account-panel">
          <div className="account-panel-heading">
            <span className="account-panel-icon"><Bell size={18}/></span>
            <div><h3>Notifications</h3><p>Choose what HotelPro sends you</p></div>
          </div>
          <PreferenceToggle
            icon={<CalendarCheck size={16}/>}
            title="Booking reminders"
            description="Updates about your upcoming stays"
            checked={preferences.bookingReminders}
            onChange={() => updatePreference('bookingReminders')}
          />
          <PreferenceToggle
            icon={<Mail size={16}/>}
            title="Email updates"
            description="Important account and reservation news"
            checked={preferences.emailUpdates}
            onChange={() => updatePreference('emailUpdates')}
          />
          <PreferenceToggle
            icon={<SlidersHorizontal size={16}/>}
            title="HotelPro news"
            description="Occasional offers and new features"
            checked={preferences.productNews}
            onChange={() => updatePreference('productNews')}
          />
        </section>

        <section className="account-panel privacy-panel">
          <span className="account-panel-icon"><ShieldCheck size={18}/></span>
          <div><h3>Your privacy matters</h3><p>These notification choices are saved on this device. You can update them any time.</p></div>
          <span className="preferences-saved"><Check size={14}/> Preferences saved automatically</span>
        </section>
      </div>
    </section>
  );
}

export function ProfileDashboard({user, bookings, savedRooms, onNavigate, onSignIn}) {
  const nextBooking = bookings
    .filter(booking => booking.status !== 'Cancelled' && booking.checkIn && new Date(`${booking.checkIn}T23:59:59`) >= new Date())
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))[0];
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {month: 'long', year: 'numeric'})
    : 'Your next great stay starts here';

  return (
    <section className="page-content profile-dashboard">
      <div className="profile-hero">
        <img src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=85" alt="A luxury resort surrounded by gardens and a swimming pool"/>
        <div className="profile-hero-shade"/>
        <div className="profile-hero-copy">
          <span className="profile-eyebrow"><Sparkles size={14}/> YOUR HOTELPRO JOURNEY</span>
          {user
            ? <h2>Welcome back,<br/><em>{user.name.split(' ')[0]}.</em></h2>
            : <h2>Make yourself<br/><em>at home.</em></h2>}
          <p>Your personal space for the stays, plans and little moments worth looking forward to.</p>
        </div>
        <div className="profile-hero-note"><MapPin size={14}/> A better stay is always within reach</div>
      </div>

      <div className="profile-welcome-row">
        <div className="profile-user-summary">
          <div className="profile-large-avatar">{userInitials(user?.name || 'Guest')}</div>
          <div><span className="profile-member-label">YOUR ACCOUNT</span><h3>{user?.name || 'HotelPro guest'}</h3><p>{user?.email || 'Sign in to personalize your account'}</p></div>
        </div>
        {user
          ? <span className="profile-member-since"><Check size={15}/> Member since {memberSince}</span>
          : <button className="profile-cta" onClick={onSignIn}>Sign in to your account <ArrowRight size={15}/></button>}
      </div>

      <div className="profile-stats">
        <button className="profile-stat-card" onClick={() => onNavigate('My bookings')}>
          <span className="profile-stat-icon"><CalendarCheck size={18}/></span>
          <span className="profile-stat-number">{bookings.length}</span>
          <span className="profile-stat-label">Your bookings</span>
          <ArrowRight className="profile-stat-arrow" size={15}/>
        </button>
        <button className="profile-stat-card" onClick={() => onNavigate('Saved stays')}>
          <span className="profile-stat-icon profile-stat-heart"><Heart size={18}/></span>
          <span className="profile-stat-number">{savedRooms.length}</span>
          <span className="profile-stat-label">Saved stays</span>
          <ArrowRight className="profile-stat-arrow" size={15}/>
        </button>
        <button className="profile-stat-card" onClick={() => onNavigate('Settings')}>
          <span className="profile-stat-icon"><UserRound size={18}/></span>
          <span className="profile-stat-number">{user ? 'Ready' : 'Guest'}</span>
          <span className="profile-stat-label">Account status</span>
          <ArrowRight className="profile-stat-arrow" size={15}/>
        </button>
      </div>

      {nextBooking ? (
        <section className="profile-section">
          <div className="profile-section-heading"><div><span className="profile-section-kicker">COMING UP</span><h3>Your next escape</h3></div><button className="profile-text-link" onClick={() => onNavigate('My bookings')}>All bookings <ArrowRight size={14}/></button></div>
          <button className="next-stay-card" onClick={() => onNavigate('My bookings')}>
            <img src={nextBooking.image || savedRooms.find(room => room.id === nextBooking.roomId)?.image} alt={nextBooking.roomName || 'Your upcoming stay'}/>
            <span className="next-stay-content"><span className="next-stay-status"><i/> CONFIRMED</span><strong>{nextBooking.roomName}</strong><span className="next-stay-meta"><CalendarCheck size={14}/> {formatStayDates(nextBooking.checkIn, nextBooking.checkOut)}</span><span className="next-stay-meta"><Users size={14}/> {nextBooking.guests} guests</span></span>
            <span className="next-stay-arrow"><ArrowRight size={17}/></span>
          </button>
        </section>
      ) : (
        <section className="profile-section profile-next-escape">
          <div className="profile-section-heading"><div><span className="profile-section-kicker">A LITTLE INSPIRATION</span><h3>Your next escape is waiting</h3></div></div>
          <button className="profile-discover-card" onClick={() => onNavigate('Discover')}>
            <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1100&q=85" alt="An inviting resort with a sparkling outdoor pool"/>
            <span className="discover-card-shade"/>
            <span className="discover-card-copy"><span>THOUGHTFUL STAYS, MADE FOR YOU</span><strong>Find a place<br/>to slow down.</strong><span className="discover-card-link">Explore stays <ArrowRight size={15}/></span></span>
          </button>
        </section>
      )}

      <section className="profile-section">
        <div className="profile-section-heading"><div><span className="profile-section-kicker">KEPT CLOSE</span><h3>Your saved stays</h3></div><button className="profile-text-link" onClick={() => onNavigate('Saved stays')}>View wishlist <ArrowRight size={14}/></button></div>
        {savedRooms.length > 0 ? (
          <div className="profile-saved-grid">
            {savedRooms.slice(0, 3).map(room => (
              <button className="profile-saved-card" key={room.id} onClick={() => onNavigate('Saved stays')}>
                <img src={room.image} alt={room.name}/>
                <span className="profile-saved-copy"><strong>{room.name}</strong><small>{room.type} · {room.size}</small></span>
                <Heart size={16} fill="currentColor"/>
              </button>
            ))}
          </div>
        ) : (
          <button className="profile-empty-saved" onClick={() => onNavigate('Discover')}><span><Heart size={18}/></span><span><strong>Save the stays you love</strong><small>Tap the heart on any room to add it to your wishlist.</small></span><ArrowRight size={16}/></button>
        )}
      </section>
    </section>
  );
}

function PreferenceToggle({icon, title, description, checked, onChange}) {
  return (
    <label className="preference-row">
      <span className="preference-icon">{icon}</span>
      <span className="preference-copy"><strong>{title}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={onChange}/>
      <span className="preference-switch" aria-hidden="true"/>
    </label>
  );
}

export function NotificationsPanel({notifications, onClose, onMarkRead, onNavigate}) {
  return (
    <section className="notifications-panel" aria-label="Notifications">
      <header className="notifications-heading">
        <div><h2>Notifications</h2><p>Your latest HotelPro updates</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close notifications"><X size={17}/></button>
      </header>
      {notifications.length > 0 ? (
        <>
          <div className="notification-list">
            {notifications.map(notification => (
              <button
                className={`notification-item ${notification.read ? '' : 'notification-unread'}`}
                key={notification.id}
                onClick={() => {
                  onMarkRead();
                  onNavigate(notification.type.startsWith('booking_') ? 'My bookings' : 'Discover');
                }}
              >
                <span className="notification-item-icon">{notification.type.startsWith('booking_') ? <CalendarCheck size={17}/> : <Bell size={17}/>}</span>
                <span className="notification-item-copy"><strong>{notification.message}</strong><small>{formatTime(notification.createdAt)}</small></span>
                {!notification.read && <i className="notification-unread-dot"/>}
              </button>
            ))}
          </div>
          <button className="mark-read-button" onClick={onMarkRead}>Mark all as read</button>
        </>
      ) : (
        <div className="notifications-empty"><span><Check size={19}/></span><strong>You’re all caught up</strong><p>Booking updates and stay reminders will show up here.</p></div>
      )}
    </section>
  );
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
}

function userInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function formatStayDates(checkIn, checkOut) {
  const dateOptions = {day: 'numeric', month: 'short', year: 'numeric'};
  const start = new Date(`${checkIn}T12:00:00`).toLocaleDateString(undefined, dateOptions);
  const end = new Date(`${checkOut}T12:00:00`).toLocaleDateString(undefined, dateOptions);
  return `${start} – ${end}`;
}
