
-- Update the admin password to a plain bcrypt-free approach
-- Store the password as-is (the edge function will compare directly)
UPDATE public.admin_settings SET value = 'DATSU68' WHERE key = 'admin_password';

-- Drop the function that depends on crypt
DROP FUNCTION IF EXISTS public.verify_admin_password(TEXT);
