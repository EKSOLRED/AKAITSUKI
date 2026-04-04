-- Замени email ниже на свой реальный email после регистрации
update public.profiles
set role = 'owner'
where email = 'your-email@example.com';
