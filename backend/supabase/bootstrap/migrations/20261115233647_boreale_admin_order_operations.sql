-- Additive operations only: no provider call, notification send, stock or monetary edit.
create function public.admin_update_order_operation(
  p_order_id uuid, p_action text, p_expected_status text, p_status text,
  p_tracking jsonb, p_expected_tracking jsonb, p_note text, p_actor text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders;
  v_before text;
  v_carrier text;
  v_number text;
  v_url text;
  v_tracking jsonb;
  v_items jsonb;
begin
  if p_action is null or p_action not in ('advance','tracking','note')
     or coalesce(pg_catalog.btrim(p_actor),'') = '' or pg_catalog.length(p_actor) > 254 then
    raise exception using errcode='23514', message='invalid_operation';
  end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0002', message='order_not_found'; end if;
  v_before := v_order.status;
  if p_action='note' then
    if coalesce(pg_catalog.btrim(p_note),'')='' or pg_catalog.length(p_note)>2000 then
      raise exception using errcode='23514', message='invalid_note';
    end if;
    insert into public.order_events(order_id,type,data)
    values(p_order_id,'admin_note',pg_catalog.jsonb_build_object('note',pg_catalog.btrim(p_note),'by',p_actor));
  else
    if p_expected_status is distinct from v_order.status then
      raise exception using errcode='23514', message='order_state_changed';
    end if;
    if p_action='advance' and p_status='cancelled' then
      if v_order.status <> 'pending' or v_order.paid_at is not null
         or not public.cancel_pending_order(p_order_id,'admin_operation') then
        raise exception using errcode='23514', message='cancellation_unavailable';
      end if;
      insert into public.order_events(order_id,type,data) values(p_order_id,'admin_cancellation',pg_catalog.jsonb_build_object('by',p_actor));
    else
      if v_order.fulfillment_status <> 'ready' or v_order.paid_at is null then
        raise exception using errcode='23514', message='fulfillment_blocked';
      end if;
      if p_action='advance' then
        if p_status is null or not (
          (v_order.status='paid' and p_status in ('processing','shipped')) or
          (v_order.status='processing' and p_status='shipped') or
          (v_order.status='shipped' and p_status='delivered')
        ) then raise exception using errcode='23514', message='invalid_transition'; end if;
      elsif v_order.status not in ('shipped','delivered') then
        raise exception using errcode='23514', message='tracking_unavailable';
      end if;
      if p_tracking is null or pg_catalog.jsonb_typeof(p_tracking)<>'object' then
        raise exception using errcode='23514', message='invalid_tracking';
      end if;
      v_tracking := pg_catalog.jsonb_build_object('carrier',v_order.tracking_carrier,'number',v_order.tracking_number,'url',v_order.tracking_url);
      if p_action='tracking' and p_expected_tracking is distinct from v_tracking then
        raise exception using errcode='23514', message='tracking_changed';
      end if;
      v_carrier := case when p_tracking ? 'trackingCarrier' then nullif(pg_catalog.btrim(p_tracking->>'trackingCarrier'),'') else v_order.tracking_carrier end;
      v_number := case when p_tracking ? 'trackingNumber' then nullif(pg_catalog.btrim(p_tracking->>'trackingNumber'),'') else v_order.tracking_number end;
      v_url := case when p_tracking ? 'trackingUrl' then nullif(pg_catalog.btrim(p_tracking->>'trackingUrl'),'') else v_order.tracking_url end;
      if pg_catalog.length(v_carrier)>80 or pg_catalog.length(v_number)>120 or pg_catalog.length(v_url)>500
         or (v_url is not null and (v_url !~* '^https?://[^/?#[:space:]@]+([/?#][^[:space:]]*)?$')) then
        raise exception using errcode='23514', message='invalid_tracking';
      end if;
      if (p_action='tracking' or p_status in ('shipped','delivered')) and (v_carrier is null or v_number is null) then
        raise exception using errcode='23514', message='tracking_required';
      end if;
      -- Preparation/delivery do not silently replace tracking supplied for another action.
      if p_action='advance' and p_status <> 'shipped' and v_tracking is distinct from
         pg_catalog.jsonb_build_object('carrier',v_carrier,'number',v_number,'url',v_url) then
        raise exception using errcode='23514', message='tracking_edit_requires_action';
      end if;
      update public.orders set
        status=case when p_action='advance' then p_status else status end,
        tracking_carrier=v_carrier,tracking_number=v_number,tracking_url=v_url,
        shipped_at=case when p_action='advance' and p_status='shipped' then now() else shipped_at end,
        delivered_at=case when p_action='advance' and p_status='delivered' then now() else delivered_at end
      where id=p_order_id;
      insert into public.order_events(order_id,type,data) values(p_order_id,
        case when p_action='tracking' then 'tracking_updated' else 'status_' || p_status end,
        pg_catalog.jsonb_build_object('from',v_before,'to',case when p_action='advance' then p_status else v_before end,
          'by',p_actor,'tracking',pg_catalog.jsonb_build_object('carrier',v_carrier,'number',v_number,'url',v_url)));
    end if;
  end if;
  select * into v_order from public.orders where id=p_order_id;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i)),'[]'::jsonb) into v_items from public.order_items i where order_id=p_order_id;
  return pg_catalog.to_jsonb(v_order) || pg_catalog.jsonb_build_object('order_items',v_items);
end;
$$;
revoke all on function public.admin_update_order_operation(uuid,text,text,text,jsonb,jsonb,text,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_update_order_operation(uuid,text,text,text,jsonb,jsonb,text,text) to service_role;
