const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function run() {
  try {
    // 1. Get a provider user ID (someone who has an assigned experience)
    const providerRes = await pool.query(
      `SELECT provider_user_id FROM experience_providers LIMIT 1`
    );
    
    if (providerRes.rows.length === 0) {
      console.log('No assigned experiences found in experience_providers.');
      return;
    }
    
    const userId = providerRes.rows[0].provider_user_id;
    console.log(`Testing with Provider User ID: ${userId}`);

    // Query 1: Assigned Experiences
    console.log('\n--- Query 1: Assigned Experiences ---');
    try {
      const q1 = await pool.query(
        `SELECT
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
        [userId]
      );
      console.log(`Success! Found ${q1.rows.length} rows.`);
    } catch (e) {
      console.error('Query 1 Failed:', e.message);
    }

    // Query 2: Availability Slots
    console.log('\n--- Query 2: Availability Slots ---');
    try {
      const q2 = await pool.query(
        `SELECT id, experience_id, slot_date, start_time, end_time,
                capacity, booked_count, is_locked, locked_by, locked_until
         FROM availability_slots
         WHERE provider_user_id = $1
         AND slot_date >= $2
         ORDER BY slot_date ASC, start_time ASC`,
        [userId, new Date().toISOString().split('T')[0]]
      );
      console.log(`Success! Found ${q2.rows.length} rows.`);
    } catch (e) {
      console.error('Query 2 Failed:', e.message);
    }

    // Query 3: Bookings
    console.log('\n--- Query 3: Bookings ---');
    try {
      const q3 = await pool.query(
        `SELECT
          b.id, b.booking_date, b.participants, b.status, b.total_price,
          b.special_requests, b.cancellation_reason, b.rescheduled_count,
          b.created_at, b.user_id,
          e.title AS experience_title, e.location_name,
          p.full_name AS client_name, u.email AS client_email,
          (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS experience_image
         FROM bookings b
         JOIN experiences e ON e.id = b.experience_id
         JOIN experience_providers ep ON ep.experience_id = e.id
         JOIN users u ON u.id = b.user_id
         LEFT JOIN profiles p ON p.id = b.user_id
         WHERE ep.provider_user_id = $1 AND ep.is_active = true
         ORDER BY b.booking_date DESC`,
        [userId]
      );
      console.log(`Success! Found ${q3.rows.length} rows.`);
    } catch (e) {
      console.error('Query 3 Failed:', e.message);
    }

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    pool.end();
  }
}

run();
