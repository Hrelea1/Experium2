-- Script SQL pentru a adăuga recenzii noi (cu utilizatori de test)
-- Rulează acest script în Supabase sau Railway SQL Editor

DO $$ 
DECLARE
    exp_via_ferrata UUID;
    exp_rafting UUID;
    exp_roata UUID;
    user_teodora UUID := gen_random_uuid();
    user_bogdan UUID := gen_random_uuid();
    user_maria UUID := gen_random_uuid();
BEGIN
    -- 1. Obținem ID-urile experiențelor după titlu
    SELECT id INTO exp_via_ferrata FROM experiences WHERE title ILIKE '%Via Ferrata%' LIMIT 1;
    SELECT id INTO exp_rafting FROM experiences WHERE title ILIKE '%Rafting%' LIMIT 1;
    SELECT id INTO exp_roata FROM experiences WHERE title ILIKE '%Roata Panoramic%' LIMIT 1;

    -- 2. Inserăm utilizatorii în tabelul `users` (dacă nu există deja)
    INSERT INTO users (id, email, full_name, is_verified, role) 
    VALUES 
      (user_teodora, 'teodora.dummy@experium.ro', 'Teodora Dincă', true, 'user'),
      (user_bogdan, 'bogdan.dummy@experium.ro', 'Bogdan Stoica', true, 'user'),
      (user_maria, 'maria.dummy@experium.ro', 'Maria Sandu', true, 'user')
    ON CONFLICT (email) DO NOTHING;

    -- În cazul în care existau deja după email, le preluăm ID-urile corecte
    SELECT id INTO user_teodora FROM users WHERE email = 'teodora.dummy@experium.ro';
    SELECT id INTO user_bogdan FROM users WHERE email = 'bogdan.dummy@experium.ro';
    SELECT id INTO user_maria FROM users WHERE email = 'maria.dummy@experium.ro';

    -- 3. Inserăm profilurile în tabelul `profiles`
    INSERT INTO profiles (id, email, full_name) 
    VALUES 
      (user_teodora, 'teodora.dummy@experium.ro', 'Teodora Dincă'),
      (user_bogdan, 'bogdan.dummy@experium.ro', 'Bogdan Stoica'),
      (user_maria, 'maria.dummy@experium.ro', 'Maria Sandu')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Inserăm recenziile (Dacă experiențele au fost găsite în baza de date)
    
    -- Recenzie: Via Ferrata
    IF exp_via_ferrata IS NOT NULL THEN
        INSERT INTO reviews (experience_id, user_id, rating, comment, status)
        VALUES (
            exp_via_ferrata, 
            user_teodora, 
            5, 
            'Chiar a fost o experiență faină, echipa a fost foarte atentă și de treabă cu noi. Atmosfera a fost relaxată și totul a mers super ok, recomand cu drag.', 
            'approved'
        )
        ON CONFLICT (experience_id, user_id) 
        DO UPDATE SET comment = EXCLUDED.comment, rating = EXCLUDED.rating;
    ELSE
        RAISE NOTICE 'Experiența "Via Ferrata" nu a fost găsită.';
    END IF;

    -- Recenzie: Rafting
    IF exp_rafting IS NOT NULL THEN
        INSERT INTO reviews (experience_id, user_id, rating, comment, status)
        VALUES (
            exp_rafting, 
            user_bogdan, 
            5, 
            'Super tare aventura, ne-am simțit pe mâini bune cu instructorii de aici. Oameni profi, voie bună și o organizare foarte corectă. Chiar merită!', 
            'approved'
        )
        ON CONFLICT (experience_id, user_id) 
        DO UPDATE SET comment = EXCLUDED.comment, rating = EXCLUDED.rating;
    ELSE
        RAISE NOTICE 'Experiența "Rafting" nu a fost găsită.';
    END IF;

    -- Recenzie: Roata Panoramică
    IF exp_roata IS NOT NULL THEN
        INSERT INTO reviews (experience_id, user_id, rating, comment, status)
        VALUES (
            exp_roata, 
            user_maria, 
            5, 
            'O experiență foarte plăcută și liniștită. Personalul a fost foarte amabil, iar atmosfera de sus e de nota 10. Totul a fost ok, o să mai revenim.', 
            'approved'
        )
        ON CONFLICT (experience_id, user_id) 
        DO UPDATE SET comment = EXCLUDED.comment, rating = EXCLUDED.rating;
    ELSE
        RAISE NOTICE 'Experiența "Roata Panoramică" nu a fost găsită.';
    END IF;

END $$;
