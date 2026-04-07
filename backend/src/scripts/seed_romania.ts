import 'dotenv/config';
import { pool } from '../db';
import { v4 as uuidv4 } from 'uuid';

const REGIONS = [
  'Transilvania',
  'Moldova',
  'Muntenia',
  'Oltenia',
  'Banat',
  'Crișana',
  'Maramureș',
  'Dobrogea',
  'Bucovina'
];

const CATEGORIES = [
  { name: 'Relax și Spa', slug: 'spa-si-relaxare', icon: 'Waves' },
  { name: 'Gourmet', slug: 'gastronomie', icon: 'Utensils' },
  { name: 'Adrenalină și Sport', slug: 'aventura-si-sport', icon: 'Mountain' },
  { name: 'Natură', slug: 'natura', icon: 'TreePine' },
];

async function seed() {
  console.log('Starting seed for Romania Regions & Categories...');

  try {
    for (const rName of REGIONS) {
      const slug = rName.toLowerCase().replace(/ș/g, 's').replace(/ă/g, 'a').replace(/â/g, 'a').replace(/ț/g, 't').replace(/î/g, 'i').replace(/ /g, '-');
      // Upsert
      await pool.query(`
        INSERT INTO regions (id, name, slug)
        VALUES ($1, $2, $3)
        ON CONFLICT (slug) DO NOTHING
      `, [uuidv4(), rName, slug]);
    }
    console.log('✅ Regions inserted');

    for (const c of CATEGORIES) {
      await pool.query(`
        INSERT INTO categories (id, name, slug, icon)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `, [uuidv4(), c.name, c.slug, c.icon]);
    }
    console.log('✅ Categories inserted');

    console.log('Seed formatting completed successfully.');
  } catch (err) {
    console.error('Failed to seed:', err);
  } finally {
    await pool.end();
  }
}

seed();
