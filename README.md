# HotelPro — Hotel Booking & Management

Full-stack hotel booking site: React + Vite frontend, Node/Express API (also deployable as Vercel serverless functions), MongoDB or a local JSON file for storage.

## Run locally
```bash
npm install
npm run dev
```
- Customer site: http://localhost:5173
- **Admin panel:** click **Sign in** on the customer site, choose the **Admin** tab, and sign in (you are taken to http://localhost:5173/admin). You can also open `/admin` directly.
- API: http://localhost:3000

Data is stored in MongoDB when `MONGODB_URI` in `.env` is valid and reachable; local development otherwise uses `data/hotelpro-local-db.json`. Demo hotels and rooms are added the first time the server starts. Vercel requires MongoDB because serverless memory and local files are not persistent.

## Two separate logins
| | Customer | Admin |
|---|---|---|
| Where | Sign in → **Customer** tab (or Create account) | Sign in → **Admin** tab on the same popup, or `/admin` directly |
| Credentials | Registered by the customer | `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (fixed, cannot be registered) |
| Token | `hotelpro_token` | `hotelpro_admin_token` |

Every admin API call is checked on the server; a customer token cannot create, edit or delete hotels, rooms or other people's bookings.

## Features
**Customer:** search hotels by city/name, dates and guests; compare up to three hotels side by side; discover destinations from the live hotel catalog; browse available rooms and date-specific availability at each hotel; click facility cards or hotel amenities to see photos, descriptions and matching hotels; see only rooms that are free for the chosen dates; 3-step booking (stay → guest details → payment); payment by card, UPI, net banking or pay-at-hotel; My bookings with details, cancel (refund marked) and delete; reserve and cancel tickets for scheduled in-house cinema screenings during an active stay; reserve and cancel spa appointments and restaurant tables during an active stay; saved rooms; profile; settings. For hotels with an in-house cinema, guests can add one movie ticket per guest during hotel checkout for ₹350 per ticket, then choose a screening in My bookings without paying again. Guests who skip the add-on can still reserve tickets and pay at the cinema. Spa appointments cost ₹1,800 per guest and are paid at the hotel; dining reservations have no prepayment. Movie playback is provided by the hotel screening, not streamed in the app. Demo hotels are available in Goa, Mumbai, Jaipur, Rishikesh, Udaipur, New Delhi, Kochi, and Shimla, with a bookable room in each destination. Demo hotel facilities include swimming pools, gym, breakfast, lunch, dinner, spa, restaurants, and in-house cinemas. The featured homepage images smoothly rotate through ten photos automatically every 2.5 seconds, with a brief blur before each image change.

**Admin:** dashboard (revenue, bookings, customers, occupancy); add/edit/delete hotels and rooms with photo upload; set a room to Available / Maintenance / Hidden; view, search, filter, update status of, or delete any booking; mark payments paid/pending/refunded; list customers.

**Rules enforced by the server:** no double-booking of a room, no past dates, guest count ≤ room capacity, prices and taxes (12%) calculated server-side, customers can only see their own bookings, a booking must be cancelled before it can be deleted by the customer, movie tickets require an active stay at a hotel with an in-house cinema and are limited by guest count, stay dates, and screening capacity, spa and dining reservations require an active stay at a hotel with the matching facility and are limited by stay dates, guest count, and time-slot capacity, hotels/rooms with active bookings cannot be deleted.

## Chatbot, support tickets & WhatsApp
- **Chat assistant** (green "Chat with us" button, bottom-right): automatically replies in English, Hindi, or Hinglish based on the customer's message; other languages receive an English fallback. No external translation service is used. It can show available rooms for chosen city + dates + guests, open the booking form for a room, show or cancel the customer's bookings, answer payment / refund / ID questions, list hotel facilities, raise **support tickets**, and check ticket status.
- **Rude or abusive language:** the bot stays calm, asks the customer to keep it respectful and offers customer support; on repeat it auto-opens a High-priority "escalated" ticket plus WhatsApp / call / email buttons.
- **WhatsApp button** (in the customer sidebar, above Settings): opens a WhatsApp chat with your number without covering hotel search or booking controls. The chatbot's welcome message is in English. Set the WhatsApp number in `.env`: `VITE_WHATSAPP_NUMBER=91XXXXXXXXXX` (country code + number, digits only). Restart `npm run dev` after changing it.
- **Admin → Tickets:** see all tickets (with chat transcript), change status, reply (customer sees the reply in the chatbot via "ticket status"), reply on WhatsApp.
- **Call appointment:** the chatbot's "Book a call" lets a customer pick a date + time slot and phone number; it appears in Admin → Tickets (category *Call appointment*), and the customer can confirm it on WhatsApp. Edit the time slots in `src/lib/support.js` and `routes/tickets.js`.
- API: `GET|POST|PUT /api/tickets` (PUT uses `?id=`).

## Payments
Payments are **simulated** (no real money moves). Only the card brand and last 4 digits are stored — the full card number and CVV never leave the browser form. To accept real payments, integrate a gateway such as Razorpay or Stripe in `lib/booking.js` / `src/BookingFlow.jsx`.

## Deploy to Vercel
The React frontend and API are deployed together: the browser calls same-origin `/api/...` endpoints, routed to the single serverless function in `api/[...path].js`. API handlers live in `routes/`.

1. Create a MongoDB Atlas database and a dedicated database user. Configure Atlas Network Access to allow Vercel connections (Atlas may require `0.0.0.0/0` because Vercel function IPs are not fixed; use a strong database password).
2. Push the project to GitHub and import it in Vercel. Set **Root Directory** to `hotelpro-project` if the project is inside a parent repository folder. Keep the `.env` file private; it is git-ignored and must not be uploaded.
3. In Vercel → **Settings → Environment Variables**, set the following for every environment you will deploy:
   - `MONGODB_URI`: your Atlas connection string (URL-encode special characters in the database username/password).
   - `MONGODB_DB`: database name, for example `hotelpro` (optional; defaults to `hotelpro`).
   - `JWT_SECRET`: a private random secret of at least 32 characters.
   - `ADMIN_EMAIL`: the administrator sign-in email.
   - `ADMIN_PASSWORD`: a private password of at least 12 characters.
   - Optional public support settings: `VITE_WHATSAPP_NUMBER`, `VITE_SUPPORT_PHONE`, and `VITE_SUPPORT_EMAIL`. These `VITE_` values are included in the frontend build, so only use them for public contact information.
4. Use the Vite preset, build command `npm run build`, and output directory `dist` (already configured in `vercel.json`). Deploy or redeploy after setting the environment variables.
5. Verify the deployed site by opening `/api/health`; it should return `{"ok":true,"storage":"mongo"}`. Then open `/api/hotels` to confirm the hotel catalog loads. If health returns an error, fix the named Vercel environment variable or Atlas connection issue and redeploy. A missing or unreachable MongoDB configuration causes API requests to fail rather than silently accepting data that would be lost.

The included `.env.example` lists the variable names for local setup. Never put `JWT_SECRET`, `ADMIN_PASSWORD`, or database credentials in a `VITE_` variable or commit them to source control.

## API
`POST /api/auth/register|login|admin-login`, `GET /api/auth/me`, `GET|POST /api/hotels`, `GET|PUT|DELETE /api/hotels/:id`, `GET|POST /api/rooms`, `GET|PUT|DELETE /api/rooms/:id`, `GET|POST /api/bookings`, `GET|PUT|DELETE /api/bookings/:id`, `GET|POST /api/movies`, `PUT /api/movies/:id`, `GET|POST /api/facilities/bookings`, `PUT /api/facilities/bookings/:id`, `GET /api/admin/stats`, `GET /api/admin/users`, `DELETE /api/admin/users/:id`.
Movie endpoints: `GET /api/movies?bookingId=...` lists upcoming screenings and the booking’s reservations; `POST /api/movies` accepts `{ bookingId, screeningId, quantity }`; `PUT /api/movies/:ticketId` with `{ status: "Cancelled" }` cancels a reservation.
Facility endpoints: `GET /api/facilities/bookings?bookingId=...` lists reservations for a hotel booking; `POST /api/facilities/bookings` accepts `{ bookingId, type: "spa" | "dining", date, time, guests }`; `PUT /api/facilities/bookings/:reservationId` with `{ status: "Cancelled" }` cancels a reservation.
