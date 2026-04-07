import { query, pool } from '../db';

async function main() {
  try {
    console.log('🔄 Updating category names...');
    
    // Define the update mappings
    const updates = [
      { slug: 'spa-relaxare', newName: 'Relax & Spa' },
      { slug: 'gastronomie', newName: 'Gourmet' },
      { slug: 'natura', newName: 'Natură' },
      { slug: 'aventura', newName: 'Adrenalină și Sport' }
    ];

    for (const update of updates) {
      const res = await query(
        `UPDATE categories SET name = $1 WHERE slug = $2`,
        [update.newName, update.slug]
      );
      console.log(`✅ Updated slug "${update.slug}" to "${update.newName}"`);
    }

    // Also check for 'spa-si-relaxare' and 'aventura-si-sport' slugs just in case
    await query(`UPDATE categories SET name = 'Relax & Spa' WHERE slug = 'spa-si-relaxare'`);
    await query(`UPDATE categories SET name = 'Adrenalină și Sport' WHERE slug = 'aventura-si-sport'`);

    console.log('✨ All categories updated successfully!');
  } catch (err) {
    console.error('❌ Failed to update categories:', err);
  } finally {
    await pool.end();
  }
}

main();
