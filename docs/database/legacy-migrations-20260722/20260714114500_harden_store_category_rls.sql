begin;

-- RLS policy calls this helper, so authenticated users need EXECUTE.
-- The function only returns whether the current user has access to
-- the supplied identity; all protected table reads remain inside the
-- SECURITY DEFINER function.
grant execute
on function public.current_user_has_identity_access(uuid)
to authenticated;

revoke execute
on function public.current_user_has_identity_access(uuid)
from anon;

drop policy if exists
  "users can manage own store categories"
on public.store_categories;

create policy
  "users can manage own store categories"
on public.store_categories
as permissive
for all
to authenticated
using (
  auth.uid() = user_id
  and public.current_user_has_identity_access(identity_id)
)
with check (
  auth.uid() = user_id
  and public.current_user_has_identity_access(identity_id)
);

comment on policy
  "users can manage own store categories"
on public.store_categories is
  'Authenticated users may manage rows written under their own user_id only when they also have access to the category identity.';

commit;
