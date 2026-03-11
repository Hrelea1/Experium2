import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeatured() {
  const { data, error } = await supabase
    .from('experiences')
    .select('id, title, is_active, is_featured')
    .eq('is_active', true)
    .eq('is_featured', true);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Featured Experiences Count:", data.length);
  console.log("Data:", data);
}

checkFeatured();
