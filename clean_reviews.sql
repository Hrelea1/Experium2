-- SQL Script to clean up orphaned or invalid reviews
-- Run this script in your Supabase or Railway SQL Editor

-- 1. Delete reviews for experiences that no longer exist
DELETE FROM reviews 
WHERE experience_id NOT IN (SELECT id FROM experiences);

-- 2. Delete reviews from users that no longer exist
DELETE FROM reviews 
WHERE user_id NOT IN (SELECT id FROM users);

-- 3. (Optional) Delete empty/dummy reviews if they were just tests
-- Uncomment the following line if you also want to delete reviews without a comment or with less than 2 characters
-- DELETE FROM reviews WHERE comment IS NULL OR trim(comment) = '' OR length(trim(comment)) < 2;

-- 4. Check the remaining reviews
-- SELECT count(*) as remaining_reviews FROM reviews;
