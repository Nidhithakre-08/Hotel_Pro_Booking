import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BedDouble, CalendarCheck, Headset, LifeBuoy, Mail, MessageCircle, Phone, Send, X } from 'lucide-react';
import { request } from './lib/api.js';
import { SLOTS, SUPPORT, isAbusive, telLink, waLink } from './lib/support.js';
import { fmtDate, money, roomFreeFor, todayIso, addDays, nightsBetween } from './lib/utils.js';
import './chatbot.css';

export function WhatsAppIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Floating WhatsApp button — opens a WhatsApp chat with the hotel's support number.
export function WhatsAppButton({ user, className = '' }) {
  const text = user ? `Hi HotelPro, I'm ${user.name} (${user.email}). I need help.` : 'Hi HotelPro, I need help with a booking.';
  const isSidebar = className.split(/\s+/).includes('wa-sidebar');
  return (
    <a className={`wa-fab ${className}`.trim()} href={waLink(text)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp support" title="WhatsApp support">
      <WhatsAppIcon size={24} />
      <span>{isSidebar ? 'WhatsApp support' : 'WhatsApp'}</span>
    </a>
  );
}

const CATEGORIES = ['Booking', 'Payment & refund', 'Cancellation', 'Room / stay issue', 'Account', 'Complaint', 'Other'];
const QUICK = [
  { label: ['Find available rooms', 'उपलब्ध कमरे खोजें', 'Available rooms dhoondhein'], icon: BedDouble, action: 'search' },
  { label: ['My bookings', 'मेरी बुकिंग', 'Meri bookings'], icon: CalendarCheck, action: 'bookings' },
  { label: ['Raise a ticket', 'सहायता अनुरोध भेजें', 'Support ticket bhejein'], icon: LifeBuoy, action: 'ticket' },
  { label: ['Book a call', 'कॉल बुक करें', 'Call book karein'], icon: Phone, action: 'call' },
  { label: ['Talk to support', 'सहायता टीम से बात करें', 'Support team se baat karein'], icon: Headset, action: 'support' },
];
let uid = 0;
const mk = (from, text, extra = {}) => ({ id: ++uid, from, text, ...extra });
const has = (t, re) => re.test(t);
const languageFor = (text) => {
  if (/[\u0900-\u097f]/.test(text)) return 'hi';
  if (/\b(mera|meri|mujhe|chahiye|batao|bataiye|hai|hain|karna|karo|kijiye|dikhaiye|kya|kaise|kitna|nahi|nahin|madad|kamra|kamre|shukriya|dhanyavad|namaste|aap|karein|chalega|khali)\b/i.test(text)) return 'hinglish';
  return 'en';
};
const localize = (language, english, hindi, hinglish = english) => language === 'hi' ? hindi : language === 'hinglish' ? hinglish : english;

export default function Chatbot({ user, hotels, rooms, bookings, dates, onSetDates, onBook, onSignIn, onBookingsChanged, onGo }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scroller = useRef(null);
  const language = useRef('en');
  const abuseCount = useRef(0);
  const missCount = useRef(0);
  const msgsRef = useRef([]); msgsRef.current = msgs;

  const cities = useMemo(() => Array.from(new Set(hotels.map((h) => h.city))).filter(Boolean), [hotels]);
  const firstName = user?.name?.split(' ')[0];
  const text = (english, hindi, hinglish = english) => localize(language.current, english, hindi, hinglish);
  const actionButton = (english, hindi, hinglish, action, value) => ({ label: text(english, hindi, hinglish), action, value });

  const push = useCallback((m) => setMsgs((p) => [...p, m]), []);
  const botSay = useCallback((text, extra) => push(mk('bot', text, extra)), [push]);
  const later = (fn, ms = 450) => { setTyping(true); setTimeout(() => { setTyping(false); fn(); }, ms); };

  useEffect(() => {
    if (open && msgs.length === 0) {
      botSay(text(`${firstName ? `Hello ${firstName}! ` : 'Hello! '}Welcome to HotelPro. I can help you find rooms, make a booking, manage reservations, or contact support. How can I help?`, `${firstName ? `नमस्ते ${firstName}! ` : 'नमस्ते! '}HotelPro में आपका स्वागत है। मैं कमरे खोजने, बुकिंग करने, आरक्षण संभालने या सहायता पाने में मदद कर सकता हूँ। बताइए, मैं कैसे मदद करूँ?`, `${firstName ? `Hello ${firstName}! ` : 'Namaste! '}HotelPro mein aapka swagat hai. Main rooms dhoondhne, booking karne ya support lene mein madad kar sakta hoon. Bataiye, kaise madad karoon?`), { quick: true });
    }
  }, [open]); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing, open]);

  // ---------- actions the bot can perform ----------
  const askCity = () => botSay(text('Which city would you like to visit? Choose one or type a city name.', 'आप किस शहर में जाना चाहते हैं? कोई शहर चुनें या उसका नाम लिखें।', 'Kis shehar jaana chahenge? Choose karein ya city ka naam likhein.'), { buttons: [...cities.map((c) => ({ label: c, action: 'city', value: c })), actionButton('Any city', 'कोई भी शहर', 'Koi bhi city', 'city', '')] });
  const askDates = (city) => botSay(text(`${city ? `${city} — ` : ''}Choose your dates and number of guests to see available rooms:`, `${city ? `${city} — ` : ''}उपलब्ध कमरे देखने के लिए तारीख़ें और मेहमानों की संख्या चुनें:`, `${city ? `${city} — ` : ''}Available rooms dekhne ke liye dates aur guests choose karein:`), { widget: 'dates', city: city || '' });

  function showRooms({ city, checkIn, checkOut, guests }) {
    onSetDates(checkIn, checkOut, guests);
    const n = nightsBetween(checkIn, checkOut);
    const hotelIds = new Set(hotels.filter((h) => !city || h.city === city).map((h) => h.id));
    const list = rooms.filter((r) => hotelIds.has(r.hotelId) && r.capacity >= guests && roomFreeFor(r, checkIn, checkOut)).sort((a, b) => a.price - b.price);
    if (!list.length) {
      return botSay(text(`Sorry, no rooms are available ${city ? `in ${city} ` : ''}for ${guests} guest(s) from ${fmtDate(checkIn)} to ${fmtDate(checkOut)}. Would you like to try different dates or another city?`, `माफ़ कीजिए, ${city ? `${city} में ` : ''}${fmtDate(checkIn)} से ${fmtDate(checkOut)} तक ${guests} मेहमानों के लिए कोई कमरा उपलब्ध नहीं है। क्या आप दूसरी तारीख़ें या शहर आज़माना चाहेंगे?`, `Sorry, ${city ? `${city} mein ` : ''}${fmtDate(checkIn)} se ${fmtDate(checkOut)} tak ${guests} guests ke liye room available nahi hai. Dusri dates ya city try karein?`), { buttons: [actionButton('Change dates', 'तारीख़ें बदलें', 'Dates badlein', 'dates', city), actionButton('Other city', 'दूसरा शहर', 'Doosri city', 'search'), actionButton('Talk to support', 'सहायता टीम से बात करें', 'Support se baat karein', 'support')] });
    }
    botSay(text(`${list.length} room${list.length > 1 ? 's' : ''} available (${fmtDate(checkIn)} → ${fmtDate(checkOut)}, ${n} night${n > 1 ? 's' : ''}, ${guests} guest${guests > 1 ? 's' : ''}). Select "Book" to continue:`, `${list.length} कमरे उपलब्ध हैं (${fmtDate(checkIn)} → ${fmtDate(checkOut)}, ${n} रात, ${guests} मेहमान)। आगे बढ़ने के लिए "बुक करें" चुनें:`, `${list.length} room${list.length > 1 ? 's' : ''} available hain (${fmtDate(checkIn)} → ${fmtDate(checkOut)}, ${n} nights, ${guests} guests). Aage badhne ke liye "Book" choose karein:`), { widget: 'rooms', rooms: list.slice(0, 6), nights: n });
  }

  function showBookings(filter) {
    if (!user) return botSay(text('Please sign in to view your bookings.', 'अपनी बुकिंग देखने के लिए कृपया साइन इन करें।', 'Apni bookings dekhne ke liye sign in karein.'), { buttons: [actionButton('Sign in', 'साइन इन करें', 'Sign in karein', 'signin')] });
    const list = (filter ? bookings.filter(filter) : bookings).slice(0, 5);
    if (!list.length) return botSay(text('No bookings found yet. Would you like to find a room?', 'अभी कोई बुकिंग नहीं मिली। क्या आप कमरा खोजना चाहेंगे?', 'Abhi koi booking nahi mili. Room dhoondhna chahenge?'), { buttons: [actionButton('Find available rooms', 'उपलब्ध कमरे खोजें', 'Available rooms dhoondhein', 'search')] });
    botSay(text('Here are your bookings:', 'यहाँ आपकी बुकिंग हैं:', 'Yeh rahi aapki bookings:'), { widget: 'bookings', items: list });
  }

  function askCancel() {
    if (!user) return botSay(text('Please sign in before cancelling a booking.', 'बुकिंग रद्द करने से पहले कृपया साइन इन करें।', 'Booking cancel karne se pehle sign in karein.'), { buttons: [actionButton('Sign in', 'साइन इन करें', 'Sign in karein', 'signin')] });
    const list = bookings.filter((b) => b.status === 'Confirmed');
    if (!list.length) return botSay(text('You have no confirmed bookings to cancel.', 'रद्द करने के लिए आपकी कोई पक्की बुकिंग नहीं है।', 'Cancel karne ke liye aapki koi confirmed booking nahi hai.'));
    botSay(text('Which booking would you like to cancel? Paid bookings are marked as refunded.', 'आप कौन-सी बुकिंग रद्द करना चाहेंगे? भुगतान की गई बुकिंग को रिफ़ंड के रूप में चिह्नित किया जाएगा।', 'Kaunsi booking cancel karni hai? Paid booking ko refunded mark kiya jayega.'), { widget: 'bookings', items: list.slice(0, 5), cancellable: true });
  }

  async function cancelBooking(b) {
    setTyping(true);
    try {
      await request(`/bookings/${b.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Cancelled' }) });
      onBookingsChanged?.();
      botSay(text(`✅ Booking ${b.bookingCode} (${b.hotelName}) has been cancelled.${b.payment?.status === 'Paid' ? ' The payment has been marked for refund.' : ''}`, `✅ बुकिंग ${b.bookingCode} (${b.hotelName}) रद्द कर दी गई है।${b.payment?.status === 'Paid' ? ' भुगतान को रिफ़ंड के लिए चिह्नित किया गया है।' : ''}`, `✅ Booking ${b.bookingCode} (${b.hotelName}) cancel ho gayi.${b.payment?.status === 'Paid' ? ' Payment refund ke liye mark kar diya hai.' : ''}`));
    } catch (e) { botSay(text(`Could not cancel the booking: ${e.message}`, `बुकिंग रद्द नहीं हो सकी: ${e.message}`, `Booking cancel nahi ho saki: ${e.message}`), { buttons: [actionButton('Talk to support', 'सहायता टीम से बात करें', 'Support se baat karein', 'support')] }); }
    finally { setTyping(false); }
  }

  function askTicket(preset = {}) { botSay(text('Of course. Please fill in the details below to send a support request. Our team will contact you.', 'ज़रूर। सहायता अनुरोध भेजने के लिए नीचे जानकारी भरें। हमारी टीम आपसे संपर्क करेगी।', 'Zaroor. Support request bhejne ke liye neeche details bharein. Hamari team aapse contact karegi.'), { widget: 'ticket', preset }); }

  function askCall() { botSay(text('Choose a date and time for a call from our team:', 'हमारी टीम से कॉल के लिए तारीख़ और समय चुनें:', 'Hamari team se call ke liye date aur time choose karein:'), { widget: 'call' }); }

  function supportCard() {
    botSay(text('Contact our support team using any of the options below:', 'नीचे दिए गए विकल्पों से हमारी सहायता टीम से संपर्क करें:', 'Neeche diye gaye options se support team se contact karein:'), { widget: 'support', buttons: [actionButton('Book a call appointment', 'कॉल बुक करें', 'Call book karein', 'call'), actionButton('Raise a ticket', 'सहायता अनुरोध भेजें', 'Support ticket bhejein', 'ticket')] });
  }

  async function ticketStatus() {
    if (!user) return botSay(text('Please sign in to view your support requests.', 'अपने सहायता अनुरोध देखने के लिए कृपया साइन इन करें।', 'Support requests dekhne ke liye sign in karein.'), { buttons: [actionButton('Sign in', 'साइन इन करें', 'Sign in karein', 'signin')] });
    setTyping(true);
    try {
      const { tickets } = await request('/tickets');
      if (!tickets.length) botSay(text('You have no support requests yet.', 'अभी आपका कोई सहायता अनुरोध नहीं है।', 'Abhi aapka koi support request nahi hai.'), { buttons: [actionButton('Raise a ticket', 'सहायता अनुरोध भेजें', 'Support ticket bhejein', 'ticket')] });
      else botSay(text('Here are your support requests:', 'यहाँ आपके सहायता अनुरोध हैं:', 'Yeh rahe aapke support requests:'), { widget: 'tickets', items: tickets.slice(0, 5) });
    } catch (e) { botSay(text(`Could not load support requests: ${e.message}`, `सहायता अनुरोध लोड नहीं हो सके: ${e.message}`, `Support requests load nahi ho sake: ${e.message}`)); } finally { setTyping(false); }
  }

  function handleAbuse() {
    abuseCount.current += 1;
    if (abuseCount.current === 1) {
      return botSay(text('I understand you may be frustrated, and I want to help. Please keep our conversation respectful 🙏. What went wrong? You can also contact our support team directly.', 'मैं समझता हूँ कि आप परेशान हो सकते हैं और मैं मदद करना चाहता हूँ। कृपया सम्मानपूर्वक बात करें 🙏। क्या समस्या हुई? आप हमारी सहायता टीम से सीधे भी संपर्क कर सकते हैं।', 'Samajh sakta hoon ki aap pareshan hain, main madad karna chahta hoon. Kripya respect se baat karein 🙏. Kya problem hui? Aap support team se seedha bhi baat kar sakte hain.'), { buttons: [actionButton('Talk to customer support', 'सहायता टीम से बात करें', 'Support team se baat karein', 'support'), actionButton('Book a call', 'कॉल बुक करें', 'Call book karein', 'call')] });
    }
    botSay(text('I’m connecting you with our support team. Submit a high-priority request below, or contact us directly by WhatsApp or phone.', 'मैं आपको हमारी सहायता टीम से जोड़ रहा हूँ। नीचे उच्च प्राथमिकता वाला अनुरोध भेजें या WhatsApp/फ़ोन से सीधे संपर्क करें।', 'Main aapko support team se connect kar raha hoon. Neeche high-priority request bhejein ya WhatsApp/phone se contact karein.'), { buttons: [] });
    askTicket({ category: 'Complaint', message: 'Customer requested human support (escalated from chatbot). Please call back.', escalated: true, priority: 'High' });
    supportCard();
  }

  function onAction(a) {
    if (a.action === 'search') return later(askCity);
    if (a.action === 'city') { push(mk('user', a.value || 'Any city')); return later(() => askDates(a.value)); }
    if (a.action === 'dates') return later(() => askDates(a.value || ''));
    if (a.action === 'bookings') { push(mk('user', 'My bookings')); return later(() => showBookings()); }
    if (a.action === 'ticket') { push(mk('user', 'Raise a ticket')); return later(() => askTicket()); }
    if (a.action === 'call') { push(mk('user', 'Book a call appointment')); return later(askCall); }
    if (a.action === 'support') { push(mk('user', 'Talk to customer support')); return later(supportCard); }
    if (a.action === 'cancel') { push(mk('user', 'Cancel a booking')); return later(askCancel); }
    if (a.action === 'ticketstatus') { push(mk('user', 'My tickets')); return ticketStatus(); }
    if (a.action === 'signin') return onSignIn();
    if (a.action === 'faq') { push(mk('user', a.label)); return later(() => answer(a.value)); }
  }

  // ---------- understanding what the customer typed ----------
  function answer(raw) {
    const t = raw.toLowerCase().trim();
    if (isAbusive(t)) return handleAbuse();

    const code = raw.match(/\bHP[0-9A-F]{7}\b/i);
    if (code) {
      if (!user) return botSay(text('Please sign in to view booking details.', 'बुकिंग की जानकारी देखने के लिए कृपया साइन इन करें।', 'Booking details dekhne ke liye sign in karein.'), { buttons: [actionButton('Sign in', 'साइन इन करें', 'Sign in karein', 'signin')] });
      const found = bookings.filter((b) => b.bookingCode.toUpperCase() === code[0].toUpperCase());
      return found.length ? showBookings((b) => b.bookingCode.toUpperCase() === code[0].toUpperCase()) : botSay(text(`Booking ${code[0].toUpperCase()} was not found in your account. Check the code or contact support.`, `आपके खाते में बुकिंग ${code[0].toUpperCase()} नहीं मिली। कोड जाँचें या सहायता टीम से संपर्क करें।`, `Aapke account mein booking ${code[0].toUpperCase()} nahi mili. Code check karein ya support se contact karein.`), { buttons: [actionButton('Talk to support', 'सहायता टीम से बात करें', 'Support se baat karein', 'support')] });
    }
    if (has(t, /\bTK[0-9a-f]{6}\b|ticket status|my tickets|mere ticket/)) return ticketStatus();

    const city = cities.find((c) => t.includes(c.toLowerCase()));
    if (has(t, /^(hi+|hello+|hey+|hii+|namaste|namaskar|good (morning|afternoon|evening))\b|^(नमस्ते|नमस्कार)/)) { missCount.current = 0; return botSay(text(`${firstName ? `Hello ${firstName}! ` : 'Hello! '}How can I help you today?`, `${firstName ? `नमस्ते ${firstName}! ` : 'नमस्ते! '}मैं आज आपकी कैसे मदद कर सकता हूँ?`, `${firstName ? `Hello ${firstName}! ` : 'Namaste! '}Aaj main aapki kaise madad karoon?`), { quick: true }); }
    if (has(t, /(thank|thanks|shukriya|dhanyavad|dhanyawad|धन्यवाद|शुक्रिया)/)) return botSay(text("You're welcome! 😊 Is there anything else I can help with?", 'आपका स्वागत है! 😊 क्या मैं किसी और चीज़ में मदद कर सकता हूँ?', 'Aapka swagat hai! 😊 Kya main aur kisi cheez mein madad karoon?'));
    if (has(t, /^(bye|goodbye|ok bye|alvida|अलविदा)\b/)) return botSay(text('Goodbye! We hope you have a wonderful stay. 🏨', 'अलविदा! आपकी यात्रा शानदार हो। 🏨', 'Alvida! Aapki stay bahut achchi ho. 🏨'));
    if (has(t, /(appointment|callback|call back|call me|call karo|call kar|phone kar|baat karni|baat karna|schedule a call|book a call|कॉल)/)) return askCall();
    if (has(t, /(human|agent|customer (care|support)|support team|executive|representative|manager|insaan|मदद|सहायता)/)) return supportCard();
    if (has(t, /(cancel|radd|रद्द|band kar)/)) return askCancel();
    if (has(t, /(refund|paisa wapas|paise wapas|money back|पैसे वापस)/)) return botSay(text('When you cancel a booking with a paid payment, it is marked as refunded. Pay-at-hotel bookings have no advance payment. If you have a refund issue, please send us a support request.', 'भुगतान की गई बुकिंग रद्द करने पर उसे रिफ़ंड के रूप में चिह्नित किया जाता है। होटल में भुगतान वाली बुकिंग में अग्रिम भुगतान नहीं होता। रिफ़ंड से जुड़ी समस्या के लिए सहायता अनुरोध भेजें।', 'Paid booking cancel karne par use refunded mark kiya jata hai. Pay-at-hotel booking mein advance payment nahi hoti. Refund issue ho to support request bhejein.'), { buttons: [actionButton('Cancel a booking', 'बुकिंग रद्द करें', 'Booking cancel karein', 'cancel'), actionButton('Raise a ticket', 'सहायता अनुरोध भेजें', 'Support ticket bhejein', 'ticket')] });
    if (has(t, /(my booking|meri booking|mera booking|booking status|booking details|reservation|booking dekh|बुकिंग देख)/)) return showBookings();
    if (has(t, /(complain|complaint|shikayat|शिकायत|problem|issue|dikkat|pareshani|samasya|दिक्कत|समस्या|not working|nahi chal|galat|wrong|fraud)/)) return askTicket({ message: raw.length > 12 ? raw : '' });
    if (has(t, /\btickets?\b/)) return botSay(text('What would you like help with?', 'आपको किस चीज़ में मदद चाहिए?', 'Aapko kis cheez mein madad chahiye?'), { buttons: [actionButton('Support request', 'सहायता अनुरोध', 'Support request', 'ticket'), actionButton('Find a hotel room', 'होटल का कमरा खोजें', 'Hotel room dhoondhein', 'search')] });
    if (has(t, /(payment|pay\b|upi|net ?banking|card|paise|gst|tax|charges?)/) && !has(t, /(book|room|available)/)) return botSay(text('Payment options include card, UPI, net banking, or pay at the hotel. A 12% tax is applied, and you will see the total before confirming. Full card details are never stored.', 'भुगतान के विकल्प: कार्ड, UPI, नेट बैंकिंग या होटल में भुगतान। 12% टैक्स लागू होता है और बुकिंग की पुष्टि से पहले कुल राशि दिखाई जाती है। कार्ड की पूरी जानकारी सेव नहीं की जाती।', 'Payment options mein card, UPI, net banking ya hotel par payment shamil hain. 12% tax lagta hai aur confirm karne se pehle total dikhaya jayega. Card ki poori details save nahi hoti.'), { buttons: [actionButton('Find available rooms', 'उपलब्ध कमरे खोजें', 'Available rooms dhoondhein', 'search')] });
    if (has(t, /(price|rate|kitna|kitne|cost|sasta|cheap|budget|कीमत|किराया)/) && !city) return botSay(text('Room rates depend on the hotel and room type. Choose your dates and I can show available rooms with the nightly price.', 'कमरे की कीमत होटल और कमरे के प्रकार पर निर्भर करती है। तारीख़ें चुनें, मैं उपलब्ध कमरे और प्रति रात की कीमत दिखाऊँगा।', 'Room rates hotel aur room type par depend karte hain. Dates choose karein, main available rooms aur per-night price dikhaunga.'), { buttons: [actionButton('Find available rooms', 'उपलब्ध कमरे खोजें', 'Available rooms dhoondhein', 'search')] });
    if (has(t, /(id proof|aadhaar|aadhar|passport|documents?)/)) return botSay(text('At check-in, guests need a valid ID such as Aadhaar, passport, driving licence, voter ID, or PAN.', 'चेक-इन के समय मेहमानों को आधार, पासपोर्ट, ड्राइविंग लाइसेंस, वोटर आईडी या PAN जैसा वैध पहचान पत्र दिखाना होगा।', 'Check-in ke samay valid ID dikhani hogi, jaise Aadhaar, passport, driving licence, voter ID ya PAN.'));
    if (has(t, /(facilit|amenit|swimming|pool|gym|breakfast|lunch|dinner|spa|सुविध|नाश्ता|दोपहर का खाना|रात का खाना|जिम|स्विमिंग|पूल|स्पा)/)) {
      const selectedHotels = city ? hotels.filter((hotel) => hotel.city === city) : hotels;
      const listings = selectedHotels.map((hotel) => `${hotel.name}: ${(hotel.amenities || []).join(', ')}`).filter((line) => !line.endsWith(': '));
      const facilities = listings.length ? listings.join('\n') : text('No hotel facilities are listed yet. Please contact support for help.', 'अभी किसी होटल की सुविधाएँ सूचीबद्ध नहीं हैं। कृपया सहायता टीम से संपर्क करें।', 'Abhi hotel facilities list nahi ki gayi hain. Support team se contact karein.');
      return botSay(text(`Here are the listed hotel facilities${city ? ` in ${city}` : ''}:\n${facilities}`, `${city ? `${city} में ` : ''}होटलों में उपलब्ध सुविधाएँ:\n${facilities}`, `${city ? `${city} mein ` : ''}listed hotel facilities:\n${facilities}`), { buttons: [actionButton('Find available rooms', 'उपलब्ध कमरे खोजें', 'Available rooms dhoondhein', 'search')] });
    }
    if (has(t, /(contact|phone number|email|address|helpline|number)/)) return supportCard();
    if (has(t, /(book|hotel|room|rooms|available|availability|stay|kamra|kamre|rukna|ruk|khali|vacant|search|dhund|dhoond|होटल|कमरा|बुक)/) || city) {
      missCount.current = 0;
      return city ? askDates(city) : askCity();
    }
    // not understood
    missCount.current += 1;
    if (missCount.current >= 2) return botSay(text('I’m not understanding your request yet. Our support team can help you directly.', 'मुझे अभी आपकी बात समझने में कठिनाई हो रही है। हमारी सहायता टीम सीधे आपकी मदद कर सकती है।', 'Mujhe abhi aapki baat samajhne mein dikkat ho rahi hai. Hamari support team seedha madad kar sakti hai.'), { buttons: [actionButton('Talk to customer support', 'सहायता टीम से बात करें', 'Support team se baat karein', 'support'), actionButton('Raise a ticket', 'सहायता अनुरोध भेजें', 'Support ticket bhejein', 'ticket')] });
    botSay(text('Sorry, I didn’t understand that. You can try one of these:', 'माफ़ कीजिए, मैं समझ नहीं पाया। इनमें से कोई विकल्प चुनें:', 'Sorry, main samajh nahi paya. Inmein se koi option choose karein:'), { quick: true });
  }

  function send(e) {
    e?.preventDefault();
    const text = input.trim(); if (!text) return;
    language.current = languageFor(text);
    setInput(''); push(mk('user', text));
    later(() => answer(text), 500);
  }

  const transcript = () => msgsRef.current.filter((m) => m.text).map((m) => ({ from: m.from, text: m.text }));
  const ctx = { user, dates, cities, transcript, botSay, text, language: language.current, push, later, cancelBooking, onBook: (room) => { setOpen(false); onBook(room); }, showRooms, onAction, onGo: (p) => { setOpen(false); onGo(p); } };

  return (
    <>
      {!open && (
        <button className="cb-fab" onClick={() => setOpen(true)} aria-label="Open HotelPro assistant" title="Chat with us"><MessageCircle size={22} /></button>
      )}
      {open && (
        <section className="cb-panel" role="dialog" aria-label="HotelPro assistant">
          <header className="cb-head">
            <div className="cb-avatar"><MessageCircle size={19} /></div>
            <div><strong>HotelPro Assistant</strong><small><i /> {text('Online · replies instantly', 'ऑनलाइन · तुरंत जवाब', 'Online · turant reply')}</small></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={19} /></button>
          </header>
          <div className="cb-body" ref={scroller}>
            {msgs.map((m) => <Message key={m.id} m={m} ctx={ctx} />)}
            {typing && <div className="cb-row bot"><div className="cb-bubble cb-typing"><i /><i /><i /></div></div>}
          </div>
          <form className="cb-input" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={text('Type your question… (English / Hindi)', 'अपना सवाल लिखें… (हिंदी / अंग्रेज़ी)', 'Apna sawaal likhein… (Hindi / English)')} maxLength={400} aria-label={text('Message', 'संदेश', 'Message')} />
            <button type="submit" disabled={!input.trim()} aria-label="Send"><Send size={18} /></button>
          </form>
          <div className="cb-foot"><a href={waLink()} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> WhatsApp</a><a href={telLink()}><Phone size={13} /> {text('Call', 'कॉल', 'Call')}</a><a href={`mailto:${SUPPORT.email}`}><Mail size={13} /> {text('Email', 'ईमेल', 'Email')}</a></div>
        </section>
      )}
    </>
  );
}

function Message({ m, ctx }) {
  return (
    <div className={`cb-row ${m.from}`}>
      <div className="cb-stack">
        <div className="cb-bubble">{m.text}</div>
        {m.widget === 'dates' && <DatesWidget ctx={ctx} city={m.city} />}
        {m.widget === 'rooms' && <RoomsWidget m={m} ctx={ctx} />}
        {m.widget === 'bookings' && <BookingsWidget m={m} ctx={ctx} />}
        {m.widget === 'tickets' && <TicketsList items={m.items} />}
        {m.widget === 'ticket' && <TicketWidget preset={m.preset} ctx={ctx} />}
        {m.widget === 'support' && <SupportWidget ctx={ctx} />}
        {m.widget === 'wa' && <div className="cb-card cb-support"><a className="wa" href={m.href} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> Confirm on WhatsApp</a></div>}
        {m.widget === 'call' && <CallWidget ctx={ctx} />}
        {m.quick && <div className="cb-chips">{QUICK.map((q) => <button key={q.action} onClick={() => ctx.onAction(q)}><q.icon size={14} /> {q.label[ctx.language === 'hi' ? 1 : ctx.language === 'hinglish' ? 2 : 0]}</button>)}</div>}
        {m.buttons?.length > 0 && <div className="cb-chips">{m.buttons.map((b) => <button key={b.label} onClick={() => ctx.onAction(b)}>{b.label}</button>)}</div>}
      </div>
    </div>
  );
}

function DatesWidget({ ctx, city }) {
  const today = todayIso();
  const [ci, setCi] = useState(ctx.dates.checkIn >= today ? ctx.dates.checkIn : addDays(today, 1));
  const [co, setCo] = useState(ctx.dates.checkOut > ci ? ctx.dates.checkOut : addDays(ci, 2));
  const [g, setG] = useState(ctx.dates.guests || 2);
  const [done, setDone] = useState(false);
  const bad = !(co > ci) || nightsBetween(ci, co) > 30;
  function go(e) {
    e.preventDefault(); if (bad) return; setDone(true);
    ctx.push({ id: ++uid, from: 'user', text: `${fmtDate(ci)} → ${fmtDate(co)} · ${g} guest${g > 1 ? 's' : ''}` });
    ctx.later(() => ctx.showRooms({ city, checkIn: ci, checkOut: co, guests: g }), 600);
  }
  return (
    <form className="cb-card cb-form" onSubmit={go}>
      <div className="cb-grid2">
        <label>{ctx.text('CHECK-IN', 'चेक-इन', 'CHECK-IN')}<input type="date" min={today} value={ci} onChange={(e) => { setCi(e.target.value); if (co <= e.target.value) setCo(addDays(e.target.value, 1)); }} disabled={done} /></label>
        <label>{ctx.text('CHECK-OUT', 'चेक-आउट', 'CHECK-OUT')}<input type="date" min={addDays(ci, 1)} value={co} onChange={(e) => setCo(e.target.value)} disabled={done} /></label>
      </div>
      <label>{ctx.text('GUESTS', 'मेहमान', 'GUESTS')}<select value={g} onChange={(e) => setG(+e.target.value)} disabled={done}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {ctx.text(n === 1 ? 'guest' : 'guests', 'मेहमान', 'guests')}</option>)}</select></label>
      {bad && <small className="cb-err">{ctx.text('Check-out must be after check-in (maximum 30 nights).', 'चेक-आउट, चेक-इन के बाद होना चाहिए (अधिकतम 30 रातें)।', 'Check-out, check-in ke baad hona chahiye (maximum 30 nights).')}</small>}
      <button className="cb-primary" disabled={bad || done}>{ctx.text('Show available rooms', 'उपलब्ध कमरे दिखाएँ', 'Available rooms dikhayein')} <ArrowRight size={15} /></button>
    </form>
  );
}
function RoomsWidget({ m, ctx }) {
  return (
    <div className="cb-rooms">
      {m.rooms.map((r) => (
        <div className="cb-room" key={r.id}>
          <img src={r.image} alt="" loading="lazy" />
          <div><b>{r.name}</b><small>{r.type} · {ctx.text('up to', 'अधिकतम', 'up to')} {r.capacity} {ctx.text('guests', 'मेहमान', 'guests')}</small><span>{money(r.price)} <i>{ctx.text('/ night', '/ रात', '/ night')}</i> · {money(r.price * m.nights)} {ctx.text('total*', 'कुल*', 'total*')}</span></div>
          <button onClick={() => ctx.onBook(r)}>{ctx.text('Book', 'बुक करें', 'Book karein')}</button>
        </div>
      ))}
      <small className="cb-note">{ctx.text('*12% tax is extra and shown in the booking form.', '*12% टैक्स अतिरिक्त है और बुकिंग फ़ॉर्म में दिखेगा।', '*12% tax extra hai, booking form mein dikhaya jayega.')}</small>
    </div>
  );
}

function BookingsWidget({ m, ctx }) {
  const [busy, setBusy] = useState(null);
  return (
    <div className="cb-rooms">
      {m.items.map((b) => (
        <div className="cb-booking" key={b.id}>
          <div><b>{b.hotelName}</b><small>{b.roomName} · {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</small><small>{b.bookingCode} · {money(b.amount)} · <em className={`cb-st st-${b.status.replace(/\W/g, '')}`}>{b.status}</em> · Payment {b.payment?.status}</small></div>
          {m.cancellable && <button className="cb-danger" disabled={busy === b.id} onClick={async () => { setBusy(b.id); await ctx.cancelBooking(b); setBusy(null); }}>{ctx.text('Cancel', 'रद्द करें', 'Cancel karein')}</button>}
        </div>
      ))}
      {!m.cancellable && m.items.some((b) => b.status === 'Confirmed') && <div className="cb-chips"><button onClick={() => ctx.onAction({ action: 'cancel' })}>{ctx.text('Cancel a booking', 'बुकिंग रद्द करें', 'Booking cancel karein')}</button><button onClick={() => ctx.onGo('My bookings')}>{ctx.text('Open My bookings', 'मेरी बुकिंग खोलें', 'Meri bookings kholein')}</button></div>}
    </div>
  );
}

function TicketsList({ items }) {
  return <div className="cb-rooms">{items.map((t) => <div className="cb-booking" key={t.id}><div><b>{t.ticketCode} · {t.category}</b><small>{t.subject}</small><small>Status: <em className="cb-st">{t.status}</em>{t.replies?.length ? ` · ${t.replies.length} repl${t.replies.length > 1 ? 'ies' : 'y'}` : ''}</small>{t.replies?.length > 0 && <small className="cb-reply">Support: {t.replies[t.replies.length - 1].text}</small>}</div></div>)}</div>;
}

function SupportWidget({ ctx }) {
  return (
    <div className="cb-card cb-support">
      <a className="wa" href={waLink()} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> {ctx.text('Chat on WhatsApp', 'WhatsApp पर बात करें', 'WhatsApp par baat karein')}</a>
      <a href={telLink()}><Phone size={16} /> {ctx.text('Call', 'कॉल करें', 'Call karein')} {SUPPORT.phone}</a>
      <a href={`mailto:${SUPPORT.email}`}><Mail size={16} /> {SUPPORT.email}</a>
    </div>
  );
}

function categoryLabel(ctx, category) {
  const labels = {
    Booking: ['Booking', 'बुकिंग', 'Booking'],
    'Payment & refund': ['Payment & refund', 'भुगतान और रिफ़ंड', 'Payment aur refund'],
    Cancellation: ['Cancellation', 'रद्द करना', 'Cancellation'],
    'Room / stay issue': ['Room / stay issue', 'कमरे / ठहरने की समस्या', 'Room / stay issue'],
    Account: ['Account', 'खाता', 'Account'],
    Complaint: ['Complaint', 'शिकायत', 'Complaint'],
    Other: ['Other', 'अन्य', 'Other'],
  };
  const words = labels[category] || [category, category, category];
  return ctx.text(words[0], words[1], words[2]);
}

function TicketWidget({ preset = {}, ctx }) {
  const u = ctx.user;
  const [f, setF] = useState({ name: u?.name || '', phone: u?.phone || '', email: u?.email || '', category: preset.category || 'Booking', bookingCode: '', message: preset.message || '' });
  const [state, setState] = useState('idle'); // idle | busy | done
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setErr(''); setState('busy');
    try {
      const { ticket } = await request('/tickets', { method: 'POST', body: JSON.stringify({ ...f, subject: `${f.category}${f.bookingCode ? ` · ${f.bookingCode}` : ''}`, escalated: !!preset.escalated, priority: preset.priority || 'Normal', transcript: ctx.transcript() }) });
      setState('done');
      ctx.botSay(ctx.text(`✅ Support request ${ticket.ticketCode} has been submitted. Our team will contact you shortly by ${f.phone ? 'phone/WhatsApp' : 'email'}. You can ask for its status using "ticket status".`, `✅ सहायता अनुरोध ${ticket.ticketCode} भेज दिया गया है। हमारी टीम जल्द ही आपसे ${f.phone ? 'फ़ोन/WhatsApp' : 'ईमेल'} से संपर्क करेगी। स्थिति जानने के लिए "टिकट स्थिति" पूछें।`, `✅ Support request ${ticket.ticketCode} bhej di gayi hai. Hamari team jaldi aapse ${f.phone ? 'phone/WhatsApp' : 'email'} par contact karegi. Status ke liye "ticket status" poochhein.`), { widget: 'support' });
    } catch (x) { setErr(x.message); setState('idle'); }
  }
  if (state === 'done') return <div className="cb-card cb-ok">{ctx.text('Support request submitted ✔', 'सहायता अनुरोध भेज दिया गया ✔', 'Support request bhej di gayi ✔')}</div>;
  return (
    <form className="cb-card cb-form" onSubmit={submit}>
      {!u && <div className="cb-grid2"><label>{ctx.text('NAME', 'नाम', 'NAME')}<input value={f.name} onChange={set('name')} maxLength={120} required /></label><label>{ctx.text('PHONE', 'फ़ोन', 'PHONE')}<input type="tel" value={f.phone} onChange={set('phone')} placeholder="+91…" /></label></div>}
      {!u && <label>{ctx.text('EMAIL (optional)', 'ईमेल (वैकल्पिक)', 'EMAIL (optional)')}<input type="email" value={f.email} onChange={set('email')} /></label>}
      <div className="cb-grid2"><label>{ctx.text('TOPIC', 'विषय', 'TOPIC')}<select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(ctx, c)}</option>)}</select></label><label>{ctx.text('BOOKING CODE', 'बुकिंग कोड', 'BOOKING CODE')}<input value={f.bookingCode} onChange={set('bookingCode')} placeholder={ctx.text('HP… (optional)', 'HP… (वैकल्पिक)', 'HP… (optional)')} maxLength={12} /></label></div>
      <label>{ctx.text('WHAT HAPPENED?', 'क्या हुआ?', 'Kya hua?')}<textarea rows={3} value={f.message} onChange={set('message')} placeholder={ctx.text('Describe the issue…', 'अपनी समस्या बताएँ…', 'Apni problem batayein…')} maxLength={1500} required /></label>
      {err && <small className="cb-err">{err}</small>}
      <button className="cb-primary" disabled={state === 'busy'}>{state === 'busy' ? ctx.text('Submitting…', 'भेजा जा रहा है…', 'Bheja ja raha hai…') : ctx.text('Submit request', 'अनुरोध भेजें', 'Request bhejein')}</button>
    </form>
  );
}

function CallWidget({ ctx }) {
  const u = ctx.user; const today = todayIso();
  const [f, setF] = useState({ name: u?.name || '', phone: u?.phone || '', date: addDays(today, 1), slot: SLOTS[0], message: '' });
  const [state, setState] = useState('idle'); const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setErr(''); setState('busy');
    try {
      const { ticket } = await request('/tickets', { method: 'POST', body: JSON.stringify({ name: f.name, phone: f.phone, email: u?.email || '', message: f.message, appointment: { date: f.date, slot: f.slot }, transcript: ctx.transcript() }) });
      setState('done');
      const wa = waLink(`Hi HotelPro, I booked a call appointment ${ticket.ticketCode} for ${fmtDate(f.date)}, ${f.slot}. Name: ${f.name}.`);
      ctx.botSay(ctx.text(`✅ Your call is booked for ${fmtDate(f.date)}, ${f.slot}. Reference: ${ticket.ticketCode}. Our team will call ${f.phone}.`, `✅ आपकी कॉल ${fmtDate(f.date)}, ${f.slot} के लिए बुक हो गई है। संदर्भ: ${ticket.ticketCode}। हमारी टीम ${f.phone} पर कॉल करेगी।`, `✅ Aapki call ${fmtDate(f.date)}, ${f.slot} ke liye book ho gayi. Reference: ${ticket.ticketCode}. Hamari team ${f.phone} par call karegi.`), { widget: 'wa', href: wa });
    } catch (x) { setErr(x.message); setState('idle'); }
  }
  if (state === 'done') return <div className="cb-card cb-ok">{ctx.text('Call appointment booked ✔', 'कॉल बुक हो गई ✔', 'Call appointment book ho gayi ✔')}</div>;
  return (
    <form className="cb-card cb-form" onSubmit={submit}>
      <div className="cb-grid2"><label>{ctx.text('NAME', 'नाम', 'NAME')}<input value={f.name} onChange={set('name')} maxLength={120} required /></label><label>{ctx.text('PHONE', 'फ़ोन', 'PHONE')}<input type="tel" value={f.phone} onChange={set('phone')} placeholder="+91…" required /></label></div>
      <div className="cb-grid2"><label>{ctx.text('DATE', 'तारीख़', 'DATE')}<input type="date" min={today} value={f.date} onChange={set('date')} required /></label><label>{ctx.text('TIME', 'समय', 'TIME')}<select value={f.slot} onChange={set('slot')}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select></label></div>
      <label>{ctx.text('TOPIC (optional)', 'विषय (वैकल्पिक)', 'TOPIC (optional)')}<input value={f.message} onChange={set('message')} placeholder={ctx.text('Booking help, refund, group stay…', 'बुकिंग, रिफ़ंड या समूह में ठहरने की जानकारी…', 'Booking help, refund, group stay…')} maxLength={300} /></label>
      {err && <small className="cb-err">{err}</small>}
      <button className="cb-primary" disabled={state === 'busy'}>{state === 'busy' ? ctx.text('Booking…', 'बुक हो रही है…', 'Booking ho rahi hai…') : ctx.text('Book call appointment', 'कॉल बुक करें', 'Call book karein')}</button>
    </form>
  );
}
