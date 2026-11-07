export const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const isoDate = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
export const todayIso = () => isoDate(new Date());
export const nightsBetween = (a, b) => Math.max(0, Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000));
export const fmtDate = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); };
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'G';
export const overlaps = (aIn, aOut, bIn, bOut) => aIn < bOut && bIn < aOut;
export const roomFreeFor = (room, checkIn, checkOut) => room.status === 'Available' && !(room.booked || []).some((b) => overlaps(checkIn, checkOut, b.checkIn, b.checkOut));
export const TAX_RATE = 0.12;

// Resize an uploaded picture in the browser so it stays small enough to store.
export function fileToDataUrl(file, maxSide = 1100, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read the image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const luhn = (num) => { const d = num.replace(/\D/g, ''); if (d.length < 12) return false; let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; };
export const cardBrand = (num) => { const d = num.replace(/\D/g, ''); if (/^4/.test(d)) return 'Visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard'; if (/^3[47]/.test(d)) return 'Amex'; if (/^(60|65|81|82)/.test(d)) return 'RuPay'; return 'Card'; };
export const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Yes Bank'];
export const ID_TYPES = ['Aadhaar', 'Passport', 'Driving licence', 'Voter ID', 'PAN card'];
export const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Family', 'Studio', 'Penthouse'];
