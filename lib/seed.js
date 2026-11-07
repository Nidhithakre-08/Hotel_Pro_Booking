const IMG = {
  pool: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85',
  r1: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
  r2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
  r3: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
  r4: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85',
  r5: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
  r6: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
  rishikesh: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=85',
  udaipur: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85',
  delhi: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=85',
  kochi: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85',
  shimla: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=85',
};
const baseHotels = [
  { id: 'H-GOA', name: 'HotelPro Beach Resort', city: 'Goa', country: 'India', address: 'Candolim Beach Road, Goa 403515', stars: 5, rating: 4.9, reviews: 412, image: IMG.pool, description: 'A beachfront resort with palm-lined pools, a spa and sunset dining just steps from the sand.', amenities: ['Swimming pool', 'Gym', 'Breakfast', 'Lunch', 'Dinner', 'Spa', 'Beach access', 'Restaurant', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-MUM', name: 'HotelPro Grand Mumbai', city: 'Mumbai', country: 'India', address: 'Marine Drive, Mumbai 400020', stars: 5, rating: 4.8, reviews: 530, image: IMG.r3, description: 'A landmark city hotel overlooking the Arabian Sea, built for business and leisure travellers.', amenities: ['Swimming pool', 'Gym', 'Breakfast', 'Lunch', 'Dinner', 'Spa', 'Sea view', 'Restaurant', 'Airport shuttle', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-JAI', name: 'HotelPro Heritage Jaipur', city: 'Jaipur', country: 'India', address: 'Civil Lines, Jaipur 302006', stars: 4, rating: 4.7, reviews: 286, image: IMG.r5, description: 'A heritage-style haveli stay with courtyards, local cuisine and warm Rajasthani hospitality.', amenities: ['Swimming pool', 'Gym', 'Breakfast', 'Lunch', 'Dinner', 'Spa', 'Courtyard', 'Restaurant', 'Yoga deck', 'Free parking', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
];
export const additionalHotels = [
  { id: 'H-RIS', name: 'HotelPro Riverside Retreat', city: 'Rishikesh', country: 'India', address: 'Neelkanth Road, Rishikesh 249302', stars: 4, rating: 4.8, reviews: 194, image: IMG.rishikesh, description: 'A peaceful riverside hideaway framed by Himalayan foothills, with yoga sessions, garden paths and restorative wellness experiences.', amenities: ['Breakfast', 'River view', 'Yoga deck', 'Spa', 'Garden', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-UDR', name: 'HotelPro Lake Palace View', city: 'Udaipur', country: 'India', address: 'Lake Pichola Road, Udaipur 313001', stars: 5, rating: 4.9, reviews: 327, image: IMG.udaipur, description: 'A graceful lakeside stay with rooftop dining, traditional Rajasthani details and beautiful views across the water.', amenities: ['Swimming pool', 'Breakfast', 'Lunch', 'Dinner', 'Lake view', 'Restaurant', 'Spa', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-DEL', name: 'HotelPro Capital House', city: 'New Delhi', country: 'India', address: 'Aerocity, New Delhi 110037', stars: 5, rating: 4.7, reviews: 286, image: IMG.delhi, description: 'A polished city retreat near the airport, combining attentive service, quiet rooms and easy access to the capital’s landmarks.', amenities: ['Swimming pool', 'Gym', 'Breakfast', 'Restaurant', 'Airport shuttle', 'Business centre', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-KOC', name: 'HotelPro Kochi Harbour', city: 'Kochi', country: 'India', address: 'Willingdon Island, Kochi 682003', stars: 4, rating: 4.6, reviews: 173, image: IMG.kochi, description: 'A calm harbour-side base for discovering Fort Kochi, with Kerala-inspired dining and relaxed views of the backwaters.', amenities: ['Breakfast', 'Lunch', 'Dinner', 'Harbour view', 'Restaurant', 'Free parking', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-SHI', name: 'HotelPro Cedar Lodge', city: 'Shimla', country: 'India', address: 'Mall Road, Shimla 171001', stars: 4, rating: 4.8, reviews: 221, image: IMG.shimla, description: 'A cosy mountain lodge with cedar-lined interiors, crisp hillside air and an inviting lounge for unwinding after a day outdoors.', amenities: ['Breakfast', 'Mountain view', 'Fireplace lounge', 'Restaurant', 'Free parking', 'In-house cinema', 'Free Wi-Fi'], status: 'Active' },
];
export const seedHotels = [...baseHotels, ...additionalHotels];
const room = (id, hotelId, name, type, price, capacity, beds, size, rating, reviews, tag, image, description, amenities) =>
  ({ id, hotelId, name, type, price, capacity, beds, size, rating, reviews, tag, image, description, amenities, status: 'Available' });
const baseRooms = [
  room('HP-101', 'H-GOA', 'The Garden Suite', 'Suite', 12500, 2, '1 King bed', '48 m²', 4.96, 128, 'GUEST FAVOURITE', IMG.r1, 'A quiet sanctuary with warm natural textures, a private balcony and leafy garden views.', ['Wi-Fi', 'Breakfast', 'Balcony', 'Rain shower']),
  room('HP-204', 'H-GOA', 'Oceanview Deluxe', 'Deluxe', 8900, 2, '1 Queen bed', '36 m²', 4.89, 96, 'OCEAN VIEW', IMG.r2, 'Wake up to the horizon in this airy room with calming tones and a sweeping sea view.', ['Wi-Fi', 'Ocean view', 'Mini bar', 'Smart TV']),
  room('HP-118', 'H-GOA', 'Minimalist Studio', 'Studio', 5200, 2, '1 Queen bed', '28 m²', 4.82, 61, 'SMART STAY', IMG.r4, 'Thoughtfully designed and beautifully simple, with everything you need for a restful reset.', ['Wi-Fi', 'Work desk', 'Coffee', 'Smart TV']),
  room('HP-305', 'H-MUM', 'The Penthouse', 'Penthouse', 28000, 4, '2 King beds', '92 m²', 5, 74, 'SIGNATURE STAY', IMG.r3, 'Our signature residence with an expansive lounge, bespoke furnishings and a private terrace.', ['Wi-Fi', 'Private terrace', 'Lounge', 'Breakfast']),
  room('HP-221', 'H-MUM', 'Urban Executive', 'Executive', 9800, 2, '1 King bed', '40 m²', 4.87, 83, 'WORK & UNWIND', IMG.r6, 'A polished city retreat with a generous work area and the comfort to switch off.', ['Wi-Fi', 'Work desk', 'Coffee', 'Lounge access']),
  room('HP-402', 'H-JAI', 'The Family Residence', 'Family', 11000, 5, '2 beds + sofa bed', '68 m²', 4.91, 112, 'FAMILY PICK', IMG.r5, 'Room to spread out, thoughtful family comforts and a cosy corner for everyone.', ['Wi-Fi', 'Family lounge', 'Breakfast', 'Bath']),
  room('HP-130', 'H-JAI', 'Royal Haveli Suite', 'Suite', 14500, 3, '1 King bed + daybed', '55 m²', 4.93, 64, 'HERITAGE', IMG.r1, 'Carved-wood interiors, a private sit-out and views over the courtyard fountain.', ['Wi-Fi', 'Courtyard view', 'Breakfast', 'Bathtub']),
];
export const additionalRooms = [
  room('HP-501', 'H-RIS', 'Ganga View Suite', 'Suite', 9800, 3, '1 King bed + daybed', '46 m²', 4.9, 58, 'RIVERSIDE ESCAPE', IMG.rishikesh, 'Wake to serene river and foothill views in this restful suite with a private balcony.', ['Wi-Fi', 'River view', 'Breakfast', 'Balcony']),
  room('HP-601', 'H-UDR', 'Lakeview Heritage Room', 'Deluxe', 13500, 2, '1 King bed', '42 m²', 4.92, 76, 'LAKE VIEW', IMG.udaipur, 'A warmly detailed room with lake-facing windows and locally inspired accents.', ['Wi-Fi', 'Lake view', 'Breakfast', 'Rain shower']),
  room('HP-701', 'H-DEL', 'Capital Club Room', 'Executive', 11200, 2, '1 King bed', '39 m²', 4.85, 68, 'CITY COMFORT', IMG.delhi, 'Settle into a quiet, contemporary room with a generous work area and airport access.', ['Wi-Fi', 'Work desk', 'Breakfast', 'Coffee']),
  room('HP-801', 'H-KOC', 'Harbour Breeze Room', 'Deluxe', 7600, 2, '1 Queen bed', '35 m²', 4.78, 47, 'HARBOUR VIEW', IMG.kochi, 'A breezy room with harbour outlooks and an easy-going coastal palette.', ['Wi-Fi', 'Harbour view', 'Breakfast', 'Mini bar']),
  room('HP-901', 'H-SHI', 'Cedar Mountain Suite', 'Suite', 8900, 3, '1 King bed + sofa bed', '44 m²', 4.88, 63, 'MOUNTAIN RETREAT', IMG.shimla, 'A snug cedar-accented suite with mountain scenery and a comfortable sitting area.', ['Wi-Fi', 'Mountain view', 'Breakfast', 'Fireplace lounge']),
];
export const seedRooms = [...baseRooms, ...additionalRooms];
