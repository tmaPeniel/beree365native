
-- Functions to enable/disable RLS temporarily for admin actions
-- These will be used during the signup process

create or replace function public.disable_rls()
returns void
language plpgsql
security definer
as $$
begin
  -- This will be used only for special operations
  -- during user profile creation
  -- Only affects the profiles table
  alter table public.profiles disable row level security;
end;
$$;

create or replace function public.enable_rls()
returns void
language plpgsql
security definer
as $$
begin
  -- Re-enable RLS after special operations
  alter table public.profiles enable row level security;
end;
$$;

-- Create a policy that allows new users to create their own profile
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Create a policy that allows users to view their own profile
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- Create a policy that allows users to update their own profile
create policy "Users can update own profile" 
on public.profiles
for update
using (auth.uid() = id);

-- Grant execute permission on the RPC functions
grant execute on function public.disable_rls to service_role;
grant execute on function public.enable_rls to service_role;
