-- PREPARED ONLY: independent review and isolated SQL QA required before application.
-- Private worker state. No email is sent by this migration.
alter table public.order_notification_outbox
  add column delivery_token uuid,
  add column delivery_body jsonb,
  add column first_attempt_at timestamptz,
  add column provider_message_id text,
  add column delivery_exhausted boolean not null default false;

create function public.claim_order_confirmations(p_limit integer,p_test_recipients text[])
returns setof public.order_notification_outbox
language plpgsql security invoker set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 2 then raise exception 'invalid_batch'; end if;
  if p_test_recipients is not null and cardinality(p_test_recipients) not between 1 and 20 then raise exception 'invalid_test_scope'; end if;
  update public.order_notification_outbox set status='failed',delivery_exhausted=true,
    delivery_token=null,last_error='manual_review_required'
    where type='confirmation' and not delivery_exhausted and status<>'sent'
      and next_attempt_at<=now() and (attempts>=5 or first_attempt_at<=now()-interval '23 hours')
      and (p_test_recipients is null or order_id in(select id from public.orders where lower(email)=any(p_test_recipients)));
  insert into public.order_operational_incidents(order_id,code,owner_role,next_action,details)
    select n.order_id,'order_confirmation_delivery','support',
      'Rapprocher le message chez le prestataire avant toute réexpédition manuelle.',
      jsonb_build_object('notification_id',n.id,'reason',n.last_error)
    from public.order_notification_outbox n join public.orders o on o.id=n.order_id
    where n.type='confirmation' and n.delivery_exhausted
      and (p_test_recipients is null or lower(o.email)=any(p_test_recipients))
    on conflict(order_id,code) do nothing;
  return query
    with due as (
      select n.id from public.order_notification_outbox n join public.orders o on o.id=n.order_id
      where n.type='confirmation' and not n.delivery_exhausted and n.status in('pending','failed','sending')
        and n.next_attempt_at<=now() and n.attempts<5
        and (n.first_attempt_at is null or n.first_attempt_at>now()-interval '23 hours')
        and (p_test_recipients is null or lower(o.email)=any(p_test_recipients))
      order by n.next_attempt_at,n.created_at,n.id limit p_limit for update of n skip locked
    )
    update public.order_notification_outbox n set status='sending',attempts=n.attempts+1,
      delivery_token=gen_random_uuid(),first_attempt_at=coalesce(n.first_attempt_at,now()),
      next_attempt_at=now()+interval '5 minutes',last_error=null
    from due where n.id=due.id returning n.*;
end $$;

create function public.freeze_order_confirmation(p_id uuid,p_token uuid,p_body jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.order_notification_outbox; k text;
begin
  select * into n from public.order_notification_outbox where id=p_id for update;
  if not found or n.type<>'confirmation' or n.status<>'sending'
    or n.delivery_token is distinct from p_token or n.next_attempt_at<=now()
    or n.first_attempt_at<=now()-interval '23 hours' then raise exception 'notification_lease_lost'; end if;
  if n.delivery_body is not null then return n.delivery_body; end if;
  if jsonb_typeof(p_body) is distinct from 'object' then raise exception 'invalid_body'; end if;
  foreach k in array array['from','to','subject','html'] loop
    if jsonb_typeof(p_body->k) is distinct from 'string' or length(p_body->>k)<1
      then raise exception 'invalid_body'; end if;
  end loop;
  if length(p_body->>'from')>320 or length(p_body->>'to')>254
    or length(p_body->>'subject')>200 or length(p_body->>'html')>100000
    then raise exception 'invalid_body'; end if;
  update public.order_notification_outbox set delivery_body=p_body where id=p_id;
  return p_body;
end $$;

create function public.finish_order_confirmation(p_id uuid,p_token uuid,p_provider_id text,p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n public.order_notification_outbox; exhausted boolean;
begin
  select * into n from public.order_notification_outbox where id=p_id for update;
  if not found or n.status<>'sending' or n.type<>'confirmation'
    or n.delivery_token is distinct from p_token or n.next_attempt_at<=now() then return false; end if;
  if p_provider_id is not null then
    if n.delivery_body is null or length(p_provider_id) not between 1 and 200 then raise exception 'invalid_provider_ack'; end if;
    update public.order_notification_outbox set status='sent',sent_at=now(),
      provider_message_id=p_provider_id,delivery_token=null,last_error=null where id=p_id;
  else
    if p_error is null or p_error not in('provider_unavailable','provider_unconfirmed','order_unverified','recipient_not_allowed','payload_invalid')
      then raise exception 'invalid_error'; end if;
    exhausted := n.attempts>=5 or n.first_attempt_at<=now()-interval '23 hours'
      or p_error in('order_unverified','recipient_not_allowed','payload_invalid');
    update public.order_notification_outbox set status='failed',delivery_exhausted=exhausted,
      delivery_token=null,last_error=p_error,
      next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,n.attempts-1)::integer)) where id=p_id;
    if exhausted then
      insert into public.order_operational_incidents(order_id,code,owner_role,next_action,details)
        values(n.order_id,'order_confirmation_delivery','support',
          'Rapprocher le message chez le prestataire avant toute réexpédition manuelle.',
          jsonb_build_object('notification_id',n.id,'reason',p_error))
        on conflict(order_id,code) do nothing;
    end if;
  end if;
  return true;
end $$;

revoke all on function public.claim_order_confirmations(integer,text[]),
  public.freeze_order_confirmation(uuid,uuid,jsonb),public.finish_order_confirmation(uuid,uuid,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.claim_order_confirmations(integer,text[]),
  public.freeze_order_confirmation(uuid,uuid,jsonb),public.finish_order_confirmation(uuid,uuid,text,text)
  to service_role;
