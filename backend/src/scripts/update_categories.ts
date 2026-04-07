import { query, pool } from '../db';

async function main() {
  try {
    console.log('🔄 Updating category names...');
    
    // Define the update mappings
    const updates = [
      { slug: 'spa-si-relaxare', newName: 'Spa și relaxare' },
      { slug: 'gastronomie', newName: 'Gastronomie' },
      { slug: 'natura', newName: 'Natură' },
      { slug: 'aventura-si-sport', newName: 'Aventură și sport' }
    ];

    for (const update of updates) {
      const res = await query(
        `UPDATE categories SET name = $1 WHERE slug = $2`,
        [update.newName, update.slug]
      );
      console.log(`✅ Updated slug "${update.slug}" to "${update.newName}"`);
    }

    // Ensure all variants of slugs are handled if they exist
    await query(`UPDATE categories SET name = 'Spa și relaxare' WHERE slug = 'spa-relaxare'`);
    await query(`UPDATE categories SET name = 'Aventură și sport' WHERE slug = 'aventura'`);

    console.log('✨ All categories updated successfully!');
  } catch (err) {
    console.error('❌ Failed to update categories:', err);
  } finally {
    await pool.end();
  }
}

main();
