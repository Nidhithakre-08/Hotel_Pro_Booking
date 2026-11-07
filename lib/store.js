// Simple data layer: MongoDB (if MONGODB_URI is valid and reachable) otherwise a local JSON file.
// Every document has a string `id`. Collections: users, hotels, rooms, bookings, movie_tickets, facility_reservations, tickets, notifications, customer_updates.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { additionalHotels, additionalRooms, seedHotels, seedRooms } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'data');
const dataFile = path.join(dataDir, 'hotelpro-local-db.json');
const COLLECTIONS = ['users', 'hotels', 'rooms', 'bookings', 'movie_tickets', 'facility_reservations', 'tickets', 'notifications', 'customer_updates'];

export const newId = (prefix = '') => prefix + crypto.randomBytes(5).toString('hex').toUpperCase();

let mode = null; // 'mongo' | 'file'
let memory = null;

function emptyDb() { return { users: [], hotels: [], rooms: [], bookings: [], movie_tickets: [], facility_reservations: [], tickets: [], notifications: [], customer_updates: [] }; }

function readFileDb() {
  if (process.env.VERCEL) { return (globalThis.__hpMem ||= emptyDb()); }
  if (memory) return memory;
  fs.mkdirSync(dataDir, { recursive: true });
  try { memory = { ...emptyDb(), ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) }; }
  catch { memory = emptyDb(); }
  return memory;
}
function saveFileDb() {
  if (process.env.VERCEL || !memory) return;
  fs.writeFileSync(dataFile, JSON.stringify(memory, null, 2));
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI?.trim();
  const vercel = Boolean(process.env.VERCEL);
  if (!uri || uri.includes('<') || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    if (vercel) throw new Error('MONGODB_URI must be configured with a valid MongoDB connection string on Vercel.');
    return false;
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000, dbName: process.env.MONGODB_DB || 'hotelpro' });
    }
    return true;
  } catch (error) {
    if (vercel && error?.name === 'MongoParseError') {
      throw new Error('MONGODB_URI is malformed. Copy the Atlas connection string and URL-encode special characters in its username or password.');
    }
    if (vercel && [18, 8000].includes(error?.code)) {
      throw new Error('MongoDB authentication failed. Check the database username and password in MONGODB_URI.');
    }
    if (vercel) throw new Error('Could not connect to MongoDB on Vercel. Check MONGODB_URI and Atlas network access.');
    console.warn('MongoDB unavailable, using local JSON storage.');
    return false;
  }
}

let initPromise = null;
export function init() {
  if (!initPromise) initPromise = (async () => {
    mode = (await connectMongo()) ? 'mongo' : 'file';
    console.log(`HotelPro storage: ${mode === 'mongo' ? 'MongoDB' : 'local JSON file'}`);
    // seed demo hotels and rooms the first time
    if ((await count('hotels')) === 0) {
      for (const h of seedHotels) await insert('hotels', { ...h });
      for (const r of seedRooms) await insert('rooms', { ...r });
    }
    // Add new demo destinations and one bookable room for each to existing installations.
    for (const hotel of additionalHotels) {
      const existing = mode === 'mongo'
        ? await col('hotels').findOne({ id: hotel.id })
        : readFileDb().hotels.find((item) => item.id === hotel.id);
      if (!existing) await insert('hotels', { ...hotel });
    }
    for (const room of additionalRooms) {
      const existing = mode === 'mongo'
        ? await col('rooms').findOne({ id: room.id })
        : readFileDb().rooms.find((item) => item.id === room.id);
      if (!existing) await insert('rooms', { ...room });
    }
    // Keep demo hotel facilities current for installations that were seeded earlier.
    for (const hotel of seedHotels) {
      if (mode === 'mongo') {
        const collection = col('hotels');
        const existing = await collection.findOne({ id: hotel.id });
        if (!existing) continue;
        const amenities = normalizeAmenities([...(existing.amenities || []), ...hotel.amenities]);
        await collection.updateOne({ id: hotel.id }, { $set: { amenities } });
      } else {
        const existing = readFileDb().hotels.find((item) => item.id === hotel.id);
        if (!existing) continue;
        existing.amenities = normalizeAmenities([...(existing.amenities || []), ...hotel.amenities]);
        saveFileDb();
      }
    }
  })();
  return initPromise;
}

function normalizeAmenities(amenities) {
  const normalized = new Map();
  for (const amenity of amenities) {
    const label = String(amenity).trim();
    if (!label) continue;
    const canonical = label.toLowerCase() === 'pool' ? 'Swimming pool' : label;
    normalized.set(canonical.toLowerCase(), canonical);
  }
  return [...normalized.values()];
}

export const storageMode = () => mode;

const col = (name) => mongoose.connection.db.collection(name);
const clean = (d) => { if (!d) return d; const { _id, ...rest } = d; return rest; };
const matches = (doc, q) => Object.entries(q || {}).every(([k, v]) => doc[k] === v);

export async function find(name, query = {}) {
  await init();
  let rows;
  if (mode === 'mongo') rows = (await col(name).find(query).toArray()).map(clean);
  else rows = readFileDb()[name].filter((d) => matches(d, query)).map((d) => ({ ...d }));
  return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
export async function findOne(name, query) { return (await find(name, query))[0] || null; }
export async function count(name) {
  if (mode === 'mongo') return col(name).countDocuments();
  return readFileDb()[name].length;
}
export async function insert(name, doc) {
  const now = new Date().toISOString();
  const row = { ...doc, id: doc.id || newId(), createdAt: now, updatedAt: now };
  if (mode === 'mongo') await col(name).insertOne({ ...row });
  else { readFileDb()[name].push(row); saveFileDb(); }
  return row;
}
export async function update(name, id, patch) {
  const next = { ...patch, updatedAt: new Date().toISOString() };
  delete next.id; delete next._id; delete next.createdAt;
  if (mode === 'mongo') {
    await col(name).updateOne({ id }, { $set: next });
    return clean(await col(name).findOne({ id }));
  }
  const db = readFileDb();
  const i = db[name].findIndex((d) => d.id === id);
  if (i < 0) return null;
  db[name][i] = { ...db[name][i], ...next };
  saveFileDb();
  return { ...db[name][i] };
}
export async function remove(name, id) {
  if (mode === 'mongo') { const r = await col(name).deleteOne({ id }); return r.deletedCount > 0; }
  const db = readFileDb();
  const before = db[name].length;
  db[name] = db[name].filter((d) => d.id !== id);
  saveFileDb();
  return db[name].length < before;
}
export async function removeWhere(name, query) {
  const rows = await find(name, query);
  for (const r of rows) await remove(name, r.id);
  return rows.length;
}
export { COLLECTIONS };
