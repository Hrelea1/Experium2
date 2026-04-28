const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function run() {
  try {
    console.log('Conectare la baza de date...');
    
    // 1. Inserare utilizatori
    await pool.query(`
      INSERT INTO users (id, email, full_name, is_verified, role) 
      VALUES 
        (gen_random_uuid(), 'teodora.dummy@experium.ro', 'Teodora Dincă', true, 'user'),
        (gen_random_uuid(), 'bogdan.dummy@experium.ro', 'Bogdan Stoica', true, 'user'),
        (gen_random_uuid(), 'maria.dummy@experium.ro', 'Maria Sandu', true, 'user')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('✅ Utilizatorii au fost adăugați.');

    // 2. Inserare profile
    await pool.query(`
      INSERT INTO profiles (id, email, full_name)
      SELECT id, email, full_name FROM users WHERE email IN ('teodora.dummy@experium.ro', 'bogdan.dummy@experium.ro', 'maria.dummy@experium.ro')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Profilurile au fost sincronizate.');

    // 3. Via Ferrata
    const res1 = await pool.query(`
      INSERT INTO reviews (experience_id, user_id, rating, comment, status)
      SELECT 
        (SELECT id FROM experiences WHERE title ILIKE '%Via Ferrata%' LIMIT 1),
        (SELECT id FROM users WHERE email = 'teodora.dummy@experium.ro'),
        5, 
        'Chiar a fost o experiență faină, echipa a fost foarte atentă și de treabă cu noi. Atmosfera a fost relaxată și totul a mers super ok, recomand cu drag.', 
        'approved'
      WHERE (SELECT id FROM experiences WHERE title ILIKE '%Via Ferrata%' LIMIT 1) IS NOT NULL
      ON CONFLICT (experience_id, user_id) DO NOTHING;
    `);
    console.log(`🔹 Via Ferrata: inserate ${res1.rowCount} recenzii.`);

    // 4. Rafting
    const res2 = await pool.query(`
      INSERT INTO reviews (experience_id, user_id, rating, comment, status)
      SELECT 
        (SELECT id FROM experiences WHERE title ILIKE '%Rafting%' LIMIT 1),
        (SELECT id FROM users WHERE email = 'bogdan.dummy@experium.ro'),
        5, 
        'Super tare aventura, ne-am simțit pe mâini bune cu instructorii de aici. Oameni profi, voie bună și o organizare foarte corectă. Chiar merită!', 
        'approved'
      WHERE (SELECT id FROM experiences WHERE title ILIKE '%Rafting%' LIMIT 1) IS NOT NULL
      ON CONFLICT (experience_id, user_id) DO NOTHING;
    `);
    console.log(`🔹 Rafting: inserate ${res2.rowCount} recenzii.`);

    // 5. Roata
    const res3 = await pool.query(`
      INSERT INTO reviews (experience_id, user_id, rating, comment, status)
      SELECT 
        (SELECT id FROM experiences WHERE title ILIKE '%Roata Panoramic%' LIMIT 1),
        (SELECT id FROM users WHERE email = 'maria.dummy@experium.ro'),
        5, 
        'O experiență foarte plăcută și liniștită. Personalul a fost foarte amabil, iar atmosfera de sus e de nota 10. Totul a fost ok, o să mai revenim.', 
        'approved'
      WHERE (SELECT id FROM experiences WHERE title ILIKE '%Roata Panoramic%' LIMIT 1) IS NOT NULL
      ON CONFLICT (experience_id, user_id) DO NOTHING;
    `);
    console.log(`🔹 Roata Panoramică: inserate ${res3.rowCount} recenzii.`);
    
    console.log('🎉 Toate recenziile au fost procesate cu succes!');
  } catch (err) {
    console.error('❌ Eroare:', err.message);
  } finally {
    pool.end();
  }
}

run();
