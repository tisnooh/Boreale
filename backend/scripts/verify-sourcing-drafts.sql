-- Real PostgreSQL checks, fully rolled back. No commercial fixtures persist.
begin;
set local role service_role;
do $qa$
declare
  p jsonb := '{"candidateKey":"BOR-ALI-20991231-99","title":"QA rollback only","supplierName":"QA supplier fixture","supplierUrl":"https://qa.en.alibaba.com/","sourcePlatform":"alibaba","sourceProductId":"9999999999999","sourceUrl":"https://www.alibaba.com/product-detail/qa_9999999999999.html","observedAt":"2026-11-15","observedFacts":{"fixture":true,"confirmedStock":null,"approvedRetailPrice":null},"missingEvidence":["QA only"],"notes":"QA first observation"}'::jsonb;
  r jsonb;
  repeated jsonb;
  pid uuid;
  cid uuid;
  bad jsonb;
  denied boolean;
begin
  r := public.upsert_sourcing_candidate_draft(p);
  pid := (r->'product'->>'id')::uuid;
  cid := (r->'candidate'->>'id')::uuid;
  if not (r->>'created')::boolean or (r->'product'->>'is_active')::boolean
     or r->'product'->>'procurement_status' <> 'unverified' then raise exception 'QA create safety failed'; end if;
  if exists(select 1 from public.product_variants where product_id=pid)
     or exists(select 1 from public.inventory i join public.product_variants v on v.id=i.variant_id where v.product_id=pid)
     then raise exception 'QA invented variant or inventory'; end if;
  repeated := public.upsert_sourcing_candidate_draft(p);
  if (repeated->>'created')::boolean or repeated->'product'->>'id' <> pid::text
     or repeated->'candidate'->>'id' <> cid::text
     or (select count(*) from public.sourcing_candidate_events where candidate_id=cid) <> 1
     then raise exception 'QA idempotence failed'; end if;

  denied := false;
  begin perform public.upsert_sourcing_candidate_draft(p || '{"supplierName":"Different fixture supplier"}'::jsonb);
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA source substitution allowed'; end if;

  denied := false;
  begin update public.products set is_active=true where id=pid;
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA draft activation allowed'; end if;
  denied := false;
  begin update public.products set procurement_status='verified',is_active=true where id=pid;
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA qualification bypass allowed'; end if;
  denied := false;
  begin update public.products set source_candidate_key=null where id=pid;
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA provenance detach allowed'; end if;
  denied := false;
  begin update public.sourcing_candidates set source_product_id='8888888888888' where id=cid;
  exception when check_violation then denied:=true; end;
  if not denied then raise exception 'QA candidate origin mutation allowed'; end if;

  r := public.upsert_sourcing_candidate_draft(p || '{"notes":"QA second observation"}'::jsonb);
  if (r->>'created')::boolean
     or (select count(*) from public.sourcing_candidate_events where candidate_id=cid) <> 2
     or not exists(select 1 from public.sourcing_candidate_events where candidate_id=cid
       and event_type='created' and snapshot->>'notes'='QA first observation')
     then raise exception 'QA provenance history lost'; end if;
  denied := false;
  begin update public.sourcing_candidate_events set event_type='updated' where candidate_id=cid;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA event update allowed'; end if;
  denied := false;
  begin delete from public.sourcing_candidate_events where candidate_id=cid;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA event delete allowed'; end if;

  -- Invalid supplier fails AFTER product insertion; the whole RPC must roll back.
  bad := p || '{"candidateKey":"BOR-ALI-20991231-98","supplierName":""}'::jsonb;
  denied := false;
  begin perform public.upsert_sourcing_candidate_draft(bad);
  exception when check_violation then denied:=true; end;
  if not denied or exists(select 1 from public.products where slug='sourcing-bor-ali-20991231-98')
     or exists(select 1 from public.sourcing_candidates where candidate_key='BOR-ALI-20991231-98')
     then raise exception 'QA late failure left an orphan'; end if;
  denied := false;
  begin perform public.upsert_sourcing_candidate_draft(p || '{"isActive":true,"stock":20}'::jsonb);
  exception when invalid_parameter_value then denied:=true; end;
  if not denied then raise exception 'QA forged commercial fields accepted'; end if;
end;
$qa$;

set local role anon;
do $qa$
declare denied boolean := false;
begin
  begin perform count(*) from public.sourcing_candidates;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA anonymous supplier read allowed'; end if;
  denied:=false;
  begin perform public.upsert_sourcing_candidate_draft('{}'::jsonb);
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA anonymous RPC allowed'; end if;
  if exists(select 1 from public.products where source_candidate_key='BOR-ALI-20991231-99')
     then raise exception 'QA draft publicly visible'; end if;
end;
$qa$;

set local role authenticated;
do $qa$
declare denied boolean := false;
begin
  begin perform count(*) from public.sourcing_candidate_events;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA customer supplier history read allowed'; end if;
  denied:=false;
  begin perform public.upsert_sourcing_candidate_draft('{}'::jsonb);
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA customer sourcing RPC allowed'; end if;
  if exists(select 1 from public.products where source_candidate_key='BOR-ALI-20991231-99')
     then raise exception 'QA customer sees unverified draft'; end if;
end;
$qa$;
rollback;
select jsonb_build_object(
  'status','passed',
  'scope','service role RPC, repeat, history, forbidden changes, late rollback, anonymous/customer isolation',
  'qa_products_remaining',(select count(*) from public.products where source_candidate_key like 'BOR-ALI-20991231-%'),
  'qa_candidates_remaining',(select count(*) from public.sourcing_candidates where candidate_key like 'BOR-ALI-20991231-%')
) as sourcing_sql_qa;
