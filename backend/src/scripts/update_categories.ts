import { query, pool } from '../db';

async function main() {
  try {
    console.log('🔄 Updating category names...');
    
    // Define the update mappings
    const updates = [
      { slug: 'spa-si-relaxare', newName: 'Relax și Spa' },
      { slug: 'gastronomie', newName: 'Gourmet' },
      { slug: 'natura', newName: 'Natură' },
      { slug: 'aventura-si-sport', newName: 'Adrenalină și Sport' }
    ];

    for (const update of updates) {
      const res = await query(
        `UPDATE categories SET name = $1 WHERE slug = $2`,
        [update.newName, update.slug]
      );
      console.log(`✅ Updated slug "${update.slug}" to "${update.newName}"`);
    }

    // Ensure all variants of slugs are handled if they exist
    await query(`UPDATE categories SET name = 'Relax și Spa' WHERE slug = 'spa-relaxare'`);
    await query(`UPDATE categories SET name = 'Adrenalină și Sport' WHERE slug = 'aventura'`);

    console.log('✨ All categories updated successfully!');
  } catch (err) {
    console.error('❌ Failed to update categories:', err);
  } finally {
    await pool.end();
  }
}

main();
