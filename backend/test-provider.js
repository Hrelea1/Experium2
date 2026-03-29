const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function run() {
  try {
    const q1 = await pool.query(
      `EXPLAIN SELECT
        ep.id,
        ep.experience_id,
        e.title, e.short_description, e.price, e.original_price,
        e.location_name, e.duration_minutes, e.max_participants,
        e.avg_rating, e.total_reviews, e.is_featured, e.is_active, e.created_at,
        e.provider_type,
        cat.name AS category_name, cat.slug AS category_slug, cat.icon AS category_icon,
        r.name AS region_name, r.slug AS region_slug,
        (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS primary_image
       FROM experience_providers ep
       JOIN experiences e ON e.id = ep.experience_id
       JOIN categories cat ON cat.id = e.category_id
       JOIN regions r ON r.id = e.region_id
       WHERE ep.provider_user_id = $1 AND ep.is_active = true
       ORDER BY e.created_at DESC`,
      ['00000000-0000-0000-0000-000000000000']
    );
    console.log('Query 1 parsed OK');
  } catch (e) {
    console.error('Query 1 Error:', e.message);
  } finally {
    pool.end();
  }
}

run();
