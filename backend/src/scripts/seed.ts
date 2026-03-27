import { pool } from '../db';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting seed process...');
    await client.query('BEGIN');

    // 1. Categories
    const categories = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Spa și relaxare', slug: 'spa-si-relaxare', icon: 'Waves' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Gastronomie', slug: 'gastronomie', icon: 'Utensils' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Natură și aventură', slug: 'natura-si-aventura', icon: 'TreePine' },
    ];
    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (id, name, slug, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
        [c.id, c.name, c.slug, c.icon]
      );
    }

    // 2. Regions
    const regions = [
      { id: '44444444-4444-4444-4444-444444444444', name: 'Transilvania', slug: 'transilvania' },
      { id: '55555555-5555-5555-5555-555555555555', name: 'Bucovina', slug: 'bucovina' },
    ];
    for (const r of regions) {
      await client.query(
        `INSERT INTO regions (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [r.id, r.name, r.slug]
      );
    }

    // 3. Provider User
    const providerEmail = 'provider@experium.ro';
    const pwHash = await bcrypt.hash('Provider123!', 12);
    const provRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_verified) 
       VALUES ($1, $2, 'Seed Provider', 'provider', true)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id`,
      [providerEmail, pwHash]
    );
    const providerId = provRes.rows[0].id;

    // 4. Experiences
    const exps = [
      {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        title: 'Zbor cu balonul în Brașov',
        desc: 'O experiență de neuitat deasupra munților.',
        price: 450,
        catId: categories[2].id,
        regId: regions[0].id,
        loc: 'Brașov',
        featured: true
      },
      {
        id: 'bbbb2222-2222-2222-2222-222222222222',
        title: 'Degustare de vinuri în Dealu Mare',
        desc: 'Descoperă arome unice de vin românesc autentic.',
        price: 250,
        catId: categories[1].id,
        regId: regions[0].id,
        loc: 'Dealu Mare',
        featured: true
      },
      {
        id: 'cccc3333-3333-3333-3333-333333333333',
        title: 'Masaj de relaxare la munte',
        desc: 'Relaxează-te complet în aer pur și peisaj de vis.',
        price: 150,
        catId: categories[0].id,
        regId: regions[0].id,
        loc: 'Sinaia',
        featured: true
      }
    ];

    for (const e of exps) {
      const expRes = await client.query(
        `INSERT INTO experiences (id, title, description, price, category_id, region_id, location_name, is_featured, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [e.id, e.title, e.desc, e.price, e.catId, e.regId, e.loc, e.featured]
      );
      
      if (expRes.rowCount && expRes.rowCount > 0) {
        await client.query(
          `INSERT INTO experience_providers (experience_id, provider_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [e.id, providerId]
        );
        await client.query(
          `INSERT INTO experience_images (experience_id, image_url, is_primary) VALUES ($1, $2, true)`,
          [e.id, 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80']
        );
      }
    }

    // 5. Homepage Content
    const heroContent = {
      title: "Descoperă România autentică cu Experium",
      subtitle: "Zeci de experiențe de neuitat pentru tine și cei dragi",
      searchPlaceholder: "Caută experiențe..."
    };
    await client.query(
      `INSERT INTO homepage_content (section_key, content) VALUES ('hero', $1)
       ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content`,
      [heroContent]
    );

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
