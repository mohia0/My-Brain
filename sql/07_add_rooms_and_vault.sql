-- Up Migration: Add rooms, update tracking, and vault support
begin;

-- 1. Add new columns to 'items' table
alter table items 
add column if not exists room_id uuid default null,
add column if not exists is_vaulted boolean default false,
add column if not exists updated_at timestamptz default now();

-- 2. Add new columns to 'folders' table
alter table folders 
add column if not exists room_id uuid default null,
add column if not exists is_vaulted boolean default false,
add column if not exists updated_at timestamptz default now();

-- 3. Create a trigger to automatically update 'updated_at' on changes
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- Trigger for items
drop trigger if exists update_items_updated_at on items;
create trigger update_items_updated_at
    before update on items
    for each row
    execute function update_updated_at_column();

-- Trigger for folders
drop trigger if exists update_folders_updated_at on folders;
create trigger update_folders_updated_at
    before update on folders
    for each row
    execute function update_updated_at_column();

-- 4. Enable efficient querying by room
create index if not exists items_room_id_idx on items(room_id);
create index if not exists folders_room_id_idx on folders(room_id);

commit;
