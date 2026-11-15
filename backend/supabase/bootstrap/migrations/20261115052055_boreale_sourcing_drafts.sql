-- Generated with installed Supabase CLI 2.115.0 migration new; canonical chain only.
-- Private sourcing records, not a catalogue seed or a permission to sell.
alter table public.products
  add column procurement_status text not null default 'unverified'
    check (procurement_status in ('unverified', 'verified')),
  add column source_candidate_key text unique,
  add constraint products_verified_before_publication
    check (not is_active or procurement_status = 'verified'),
  add constraint products_sourcing_identity unique (id, source_candidate_key);

create table public.sourcing_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null unique check (candidate_key ~ '^BOR-ALI-[0-9]{8}-[0-9]{2}$'),
  product_id uuid not null unique,
  title text not null check (length(title) between 2 and 160),
  supplier_name text not null check (length(supplier_name) between 2 and 200),
  supplier_url text not null check (supplier_url ~ '^https://([A-Za-z0-9-]+\.)*alibaba\.(com|co\.uk)(/|$)'),
  source_platform text not null default 'alibaba' check (source_platform = 'alibaba'),
  source_product_id text not null check (source_product_id ~ '^[0-9]{10,20}$'),
  source_url text not null check (source_url ~ '^https://([A-Za-z0-9-]+\.)*alibaba\.(com|co\.uk)(/|$)'),
  observed_at date not null,
  observed_facts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(observed_facts) = 'object' and octet_length(observed_facts::text) <= 65536),
  missing_evidence text[] not null default '{}'::text[] check (cardinality(missing_evidence) <= 50),
  notes text check (length(notes) <= 10000),
  status text not null default 'unverified' check (status = 'unverified'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sourcing_candidate_product_fk foreign key (product_id, candidate_key)
    references public.products(id, source_candidate_key) on delete restrict,
  constraint sourcing_candidate_origin_unique unique (source_platform, supplier_url, source_product_id)
);

create table public.sourcing_candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.sourcing_candidates(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);
create index sourcing_candidate_events_candidate_idx
  on public.sourcing_candidate_events(candidate_id, created_at, id);

alter table public.sourcing_candidates enable row level security;
alter table public.sourcing_candidate_events enable row level security;
revoke all on public.sourcing_candidates, public.sourcing_candidate_events from public, anon, authenticated, service_role;
grant select, insert, update on public.sourcing_candidates to service_role;
grant select, insert on public.sourcing_candidate_events to service_role;

create function private.guard_sourcing_product()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.source_candidate_key is not null and
     new.source_candidate_key is distinct from old.source_candidate_key then
    raise exception using errcode = '23514', message = 'sourcing_identity_immutable';
  end if;
  if new.source_candidate_key is not null and
     (new.procurement_status <> 'unverified' or new.is_active) then
    raise exception using errcode = '23514', message = 'sourced_draft_unqualified';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_sourcing_product() from public, anon, authenticated;
create trigger guard_sourcing_product before insert or update on public.products
  for each row execute function private.guard_sourcing_product();

create function private.guard_sourcing_candidate_origin()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.candidate_key,new.product_id,new.supplier_name,new.supplier_url,new.source_platform,new.source_product_id,new.source_url)
     is distinct from row(old.candidate_key,old.product_id,old.supplier_name,old.supplier_url,old.source_platform,old.source_product_id,old.source_url) then
    raise exception using errcode = '23514', message = 'candidate_source_conflict';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_sourcing_candidate_origin() from public, anon, authenticated;
create trigger guard_sourcing_candidate_origin before update on public.sourcing_candidates
  for each row execute function private.guard_sourcing_candidate_origin();

create function private.record_sourcing_candidate_event()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.sourcing_candidate_events(candidate_id,event_type,snapshot)
    values(new.id,case when tg_op = 'INSERT' then 'created' else 'updated' end,to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.record_sourcing_candidate_event() from public, anon, authenticated;
create trigger record_sourcing_candidate_event after insert or update on public.sourcing_candidates
  for each row execute function private.record_sourcing_candidate_event();

create function public.upsert_sourcing_candidate_draft(p_candidate jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_key text;
  v_product public.products;
  v_candidate public.sourcing_candidates;
  v_observed date;
  v_missing text[];
  v_created boolean := false;
  v_changed boolean := false;
begin
  if p_candidate is null or jsonb_typeof(p_candidate) <> 'object' or
     octet_length(p_candidate::text) > 80000 or exists (
       select 1 from jsonb_object_keys(p_candidate) k where k not in
       ('candidateKey','title','supplierName','supplierUrl','sourcePlatform','sourceProductId','sourceUrl','observedAt','observedFacts','missingEvidence','notes')
     ) then
    raise exception using errcode = '22023', message = 'invalid_sourcing_input';
  end if;
  v_key := p_candidate->>'candidateKey';
  if v_key is null or v_key !~ '^BOR-ALI-[0-9]{8}-[0-9]{2}$' or
     coalesce(p_candidate->>'sourcePlatform','') <> 'alibaba' or
     coalesce(p_candidate->>'observedAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or
     coalesce(jsonb_typeof(p_candidate->'observedFacts'),'null') <> 'object' or
     coalesce(jsonb_typeof(p_candidate->'missingEvidence'),'null') <> 'array' or
     jsonb_array_length(p_candidate->'missingEvidence') > 50 or exists (
       select 1 from jsonb_array_elements(p_candidate->'missingEvidence') e
       where jsonb_typeof(e) <> 'string' or length(e #>> '{}') not between 1 and 500
     ) then
    raise exception using errcode = '22023', message = 'invalid_sourcing_input';
  end if;
  v_observed := (p_candidate->>'observedAt')::date;
  select coalesce(array_agg(value), '{}'::text[]) into v_missing
    from jsonb_array_elements_text(p_candidate->'missingEvidence');
  -- One identity lock covers both the initial insert and concurrent repeated import.
  perform pg_advisory_xact_lock(hashtextextended('boreale-sourcing:' || v_key, 0));
  select * into v_candidate from public.sourcing_candidates where candidate_key = v_key for update;
  if found then
    if row(v_candidate.supplier_name,v_candidate.supplier_url,v_candidate.source_platform,v_candidate.source_product_id,v_candidate.source_url)
       is distinct from row(p_candidate->>'supplierName',p_candidate->>'supplierUrl',p_candidate->>'sourcePlatform',p_candidate->>'sourceProductId',p_candidate->>'sourceUrl') then
      raise exception using errcode = '23514', message = 'candidate_source_conflict';
    end if;
    select * into strict v_product from public.products where id = v_candidate.product_id for update;
    if v_product.is_active or v_product.procurement_status <> 'unverified' or
       v_product.source_candidate_key is distinct from v_key then
      raise exception using errcode = '23514', message = 'sourced_draft_unqualified';
    end if;
    v_changed := row(v_candidate.title,v_candidate.observed_at,v_candidate.observed_facts,v_candidate.missing_evidence,v_candidate.notes)
      is distinct from row(p_candidate->>'title',v_observed,p_candidate->'observedFacts',v_missing,p_candidate->>'notes');
    if v_changed then
      update public.sourcing_candidates set title = p_candidate->>'title', observed_at = v_observed,
        observed_facts = p_candidate->'observedFacts', missing_evidence = v_missing,
        notes = p_candidate->>'notes', updated_at = now()
      where id = v_candidate.id returning * into v_candidate;
      update public.products set name = v_candidate.title, updated_at = now()
        where id = v_product.id returning * into v_product;
    end if;
  else
    insert into public.products(slug,name,description,is_active,procurement_status,source_candidate_key)
      values ('sourcing-' || lower(v_key), p_candidate->>'title',
        'Dossier de sourcing non vérifié. Ce brouillon ne peut pas être commandé.',
        false, 'unverified', v_key) returning * into v_product;
    insert into public.sourcing_candidates(candidate_key,product_id,title,supplier_name,supplier_url,
      source_platform,source_product_id,source_url,observed_at,observed_facts,missing_evidence,notes)
    values (v_key,v_product.id,p_candidate->>'title',p_candidate->>'supplierName',p_candidate->>'supplierUrl',
      p_candidate->>'sourcePlatform',p_candidate->>'sourceProductId',p_candidate->>'sourceUrl',
      v_observed,p_candidate->'observedFacts',v_missing,p_candidate->>'notes') returning * into v_candidate;
    v_created := true;
  end if;
  return jsonb_build_object('candidate', to_jsonb(v_candidate), 'product', to_jsonb(v_product), 'created', v_created);
end;
$$;
revoke all on function public.upsert_sourcing_candidate_draft(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.upsert_sourcing_candidate_draft(jsonb) to service_role;
