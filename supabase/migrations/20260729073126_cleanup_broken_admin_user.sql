-- Remove the broken admin user that was inserted via raw SQL (missing auth.identities entry)
-- This clears the way for a clean signup via the auth API.
DELETE FROM auth.identities WHERE user_id = 'b0236d65-ce52-4624-89d8-91b46e305665';
DELETE FROM auth.users WHERE id = 'b0236d65-ce52-4624-89d8-91b46e305665';
