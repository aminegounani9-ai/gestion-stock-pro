-- Trigger-only function; do not expose direct RPC execution to clients.
revoke all on function public.notify_spare_part_request_roles() from public,anon,authenticated;
