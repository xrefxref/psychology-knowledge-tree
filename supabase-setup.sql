-- =====================================================================
-- shenzhen-ai.icu 留言系统建表 + RLS 策略
-- 在 Supabase 控制台 → SQL Editor → New Query 中粘贴本文件全部内容，
-- 点 Run 执行。执行成功后此文件可以从仓库删除（不要推上线）。
-- =====================================================================

-- 1) 留言表 -------------------------------------------------------------
create table if not exists public.psy_comment (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  username    text not null,
  content     text not null check (char_length(content) between 1 and 1000),
  page_key    text not null default 'global',
  status      text not null default 'pending' check (status in ('pending','featured')),
  featured_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists psy_comment_status_page_created_idx
  on public.psy_comment (page_key, status, created_at desc);

-- 2) 站长判定函数 ------------------------------------------------------
-- 判定逻辑：auth.users.email 本地部分（@ 之前）等于 'admin'
-- 用函数封装，将来想改判定规则只改这里一处即可
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select split_part(email,'@',1) = 'admin'
       from auth.users where id = auth.uid()),
    false
  );
$$;

-- 3) 开启行级安全 ------------------------------------------------------
alter table public.psy_comment enable row level security;

-- 删除旧策略（若存在），避免重复创建报错
drop policy if exists "select_comment" on public.psy_comment;
drop policy if exists "insert_comment"  on public.psy_comment;
drop policy if exists "update_comment"  on public.psy_comment;
drop policy if exists "delete_comment"  on public.psy_comment;

-- 读：
--   - 任何人都能看到 status='featured' 的精选留言
--   - 作者能看自己的所有留言
--   - 站长（is_admin）能看所有
create policy "select_comment"
  on public.psy_comment for select
  using (
    status = 'featured'
    or user_id = auth.uid()
    or public.is_admin()
  );

-- 写：仅登录用户可为自己的插入（status 由前端传入，但 RLS 仅校验 user_id）
create policy "insert_comment"
  on public.psy_comment for insert
  with check (user_id = auth.uid());

-- 改：作者可改自己的；站长可改任意
create policy "update_comment"
  on public.psy_comment for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- 删：作者可删自己的；站长可删任意
create policy "delete_comment"
  on public.psy_comment for delete
  using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- 执行完毕后请到 Authentication → Settings：
--   1) 确认 "Enable email confirmations" 已关闭
--   2) 确认 "Enable email signup" 已开启（默认开启）
-- =====================================================================
