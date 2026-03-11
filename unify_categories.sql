-- SQL Script to Unify Database Categories 
-- This script safely updates the categories table to match the 4 primary frontend categories.
-- Note: Make sure to run this script in your Supabase SQL Editor.

-- 1. Insert or Update the 4 primary categories
INSERT INTO categories (name, slug, description)
VALUES 
  ('Relax & Spa', 'spa-relaxare', 'Experiențe de relaxare, spa și wellness'),
  ('Gourmet', 'gastronomie', 'Degustări de vinuri, cursuri de gătit și experiențe culinare'),
  ('Adrenaline & Sport', 'aventura', 'Sporturi extreme, zboruri și aventuri pline de adrenalină'),
  ('Natură', 'natura', 'Drumeții, safari și explorări în natură')
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Migrate existing experiences from old categories to the new primary ones
UPDATE experiences SET category_id = (SELECT id FROM categories WHERE slug = 'aventura') 
WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('sport'));

UPDATE experiences SET category_id = (SELECT id FROM categories WHERE slug = 'spa-relaxare') 
WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('romantic'));

UPDATE experiences SET category_id = (SELECT id FROM categories WHERE slug = 'natura') 
WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('calatorii'));

-- (Optional) 3. Delete the old unused categories
DELETE FROM categories WHERE slug IN ('sport', 'romantic', 'calatorii', 'arta-cultura');
