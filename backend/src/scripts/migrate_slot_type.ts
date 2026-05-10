import { query } from '../db';

async function migrate() {
  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'availability_slots' AND column_name = 'slot_type'
        ) THEN
          ALTER TABLE availability_slots
            ADD COLUMN slot_type TEXT NOT NULL DEFAULT 'hourly';
          ALTER TABLE availability_slots
            ADD CONSTRAINT chk_slot_type CHECK (slot_type IN ('hourly', 'daily'));
          RAISE NOTICE 'Column slot_type added successfully';
        ELSE
          RAISE NOTICE 'Column slot_type already exists, skipping';
        END IF;
      END $$;
    `);
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
