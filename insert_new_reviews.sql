-- Script SQL Simplificat pentru a adăuga recenzii noi (cu utilizatori de test)
-- Varianta simplă - rulează perfect în consola Railway

-- 1. Inserăm utilizatorii
INSERT INTO users (id, email, full_name, is_verified, role) 
VALUES 
  (gen_random_uuid(), 'teodora.dummy@experium.ro', 'Teodora Dincă', true, 'user'),
  (gen_random_uuid(), 'bogdan.dummy@experium.ro', 'Bogdan Stoica', true, 'user'),
  (gen_random_uuid(), 'maria.dummy@experium.ro', 'Maria Sandu', true, 'user')
ON CONFLICT (email) DO NOTHING;

-- 2. Inserăm profilurile (necesare pentru a afișa numele și poza)
INSERT INTO profiles (id, email, full_name)
SELECT id, email, full_name FROM users WHERE email IN ('teodora.dummy@experium.ro', 'bogdan.dummy@experium.ro', 'maria.dummy@experium.ro')
ON CONFLICT (id) DO NOTHING;

-- 3. Recenzie: Via Ferrata (pentru Teodora)
INSERT INTO reviews (experience_id, user_id, rating, comment, status)
SELECT 
  (SELECT id FROM experiences WHERE title ILIKE '%Via Ferrata%' LIMIT 1),
  (SELECT id FROM users WHERE email = 'teodora.dummy@experium.ro'),
  5, 
  'Chiar a fost o experiență faină, echipa a fost foarte atentă și de treabă cu noi. Atmosfera a fost relaxată și totul a mers super ok, recomand cu drag.', 
  'approved'
WHERE (SELECT id FROM experiences WHERE title ILIKE '%Via Ferrata%' LIMIT 1) IS NOT NULL
ON CONFLICT (experience_id, user_id) DO NOTHING;

-- 4. Recenzie: Rafting (pentru Bogdan)
INSERT INTO reviews (experience_id, user_id, rating, comment, status)
SELECT 
  (SELECT id FROM experiences WHERE title ILIKE '%Rafting%' LIMIT 1),
  (SELECT id FROM users WHERE email = 'bogdan.dummy@experium.ro'),
  5, 
  'Super tare aventura, ne-am simțit pe mâini bune cu instructorii de aici. Oameni profi, voie bună și o organizare foarte corectă. Chiar merită!', 
  'approved'
WHERE (SELECT id FROM experiences WHERE title ILIKE '%Rafting%' LIMIT 1) IS NOT NULL
ON CONFLICT (experience_id, user_id) DO NOTHING;

-- 5. Recenzie: Roata Panoramică (pentru Maria)
INSERT INTO reviews (experience_id, user_id, rating, comment, status)
SELECT 
  (SELECT id FROM experiences WHERE title ILIKE '%Roata Panoramic%' LIMIT 1),
  (SELECT id FROM users WHERE email = 'maria.dummy@experium.ro'),
  5, 
  'O experiență foarte plăcută și liniștită. Personalul a fost foarte amabil, iar atmosfera de sus e de nota 10. Totul a fost ok, o să mai revenim.', 
  'approved'
WHERE (SELECT id FROM experiences WHERE title ILIKE '%Roata Panoramic%' LIMIT 1) IS NOT NULL
ON CONFLICT (experience_id, user_id) DO NOTHING;
