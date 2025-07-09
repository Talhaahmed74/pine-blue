
-- Update admin email to hammad.switch@gmail.com
UPDATE auth.users 
SET email = 'hammad.switch@gmail.com',
    raw_user_meta_data = '{"full_name": "Admin User"}'
WHERE email = 'admin@bluepineresort.com';

-- Update identity table as well
UPDATE auth.identities 
SET identity_data = '{"sub": "00000000-0000-0000-0000-000000000001", "email": "hammad.switch@gmail.com"}'
WHERE user_id = '00000000-0000-0000-0000-000000000001';
