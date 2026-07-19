insert into items (id, name) values
  ('0b03a9', 'Ruby'),
  ('0b03aa', 'Sapphire'),
  ('0b03b1', 'Obsidian Shard'),
  ('0b03a8', 'Onyx Gemstone')
on conflict (id) do nothing;
