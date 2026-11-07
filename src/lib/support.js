// Support contact details used by the chatbot and the WhatsApp button.
// Change the number in .env (VITE_WHATSAPP_NUMBER, country code + number, digits only, e.g. 919876543210).
const clean = (v) => String(v || '').replace(/\D/g, '');
// WhatsApp requires an international number without "+" or other punctuation.
export const waPhone = (p) => {
  const digits = clean(p);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
};

export const SUPPORT = {
  whatsapp: waPhone(import.meta.env.VITE_WHATSAPP_NUMBER) || '919876543210',
  phone: import.meta.env.VITE_SUPPORT_PHONE || '+91 98765 43210',
  email: import.meta.env.VITE_SUPPORT_EMAIL || 'hello@hotelpro.com',
};
export const SLOTS = ['10:00 AM – 12:00 PM', '12:00 PM – 2:00 PM', '2:00 PM – 4:00 PM', '4:00 PM – 6:00 PM'];
export const waLink = (text = 'Hi HotelPro, I need help with my booking.') => `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(text)}`;
export const telLink = () => `tel:${SUPPORT.phone.replace(/[^\d+]/g, '')}`;

// Rude / abusive language detection (English, Hinglish, Hindi). Used only to calmly hand the customer to a human.
const ABUSE = [
  'fuck', 'fck', 'shit', 'bitch', 'bastard', 'asshole', 'idiot', 'stupid', 'moron', 'dumb', 'shut up', 'stfu', 'wtf',
  'bc', 'mc', 'bsdk', 'bhenchod', 'behenchod', 'madarchod', 'maderchod', 'chutiya', 'chutiye', 'gaand', 'gandu', 'harami', 'haramkhor', 'kutta', 'kamina', 'kameena',
  'saala', 'saale', 'bakwas', 'pagal', 'bewakoof', 'bewakuf', 'ullu', 'nalayak', 'tatti', 'randi', 'lund', 'loda', 'lode', 'bhosd',
  'चूतिया', 'गांडू', 'हरामी', 'कुत्ता', 'कमीना', 'बकवास', 'बेवकूफ', 'मादरचोद', 'भेनचोद', 'साला', 'पागल', 'गंदा',
];
const ABUSE_RE = new RegExp(`(^|[^a-z\\u0900-\\u097f])(${ABUSE.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-z\\u0900-\\u097f])`, 'i');
export const isAbusive = (text) => ABUSE_RE.test(String(text || '').toLowerCase().replace(/[*@$!0]/g, (c) => ({ '*': 'u', '@': 'a', $: 's', '!': 'i', 0: 'o' }[c])).replace(/[._\-]+/g, ' ').replace(/\s+/g, ' '));
