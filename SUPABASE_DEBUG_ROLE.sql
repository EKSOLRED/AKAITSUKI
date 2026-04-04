select id, email, name, role, created_at, updated_at
from public.profiles
order by created_at asc;

update public.profiles
set role = 'owner',
    updated_at = now()
where email = 'your-email@example.com';

select id, email, role
from public.profiles
where email = 'your-email@example.com';
