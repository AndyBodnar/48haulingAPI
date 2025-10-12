-- STEP 4: Find your user and promote to admin
-- Run this after STEP3_seed.sql

-- First, find your user ID and email
SELECT id, email FROM auth.users;

-- Then replace YOUR_EMAIL below with your actual email and run:
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');
