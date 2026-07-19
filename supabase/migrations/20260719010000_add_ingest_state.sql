-- Tracks which item batch /api/ingest processed last, so batches rotate
-- strictly once per actual invocation instead of being derived from
-- wall-clock time (which breaks when GitHub Actions delays or skips a
-- scheduled run).
create table ingest_state (
  id smallint primary key default 1 check (id = 1),
  last_batch integer not null default -1
);

insert into ingest_state (id, last_batch) values (1, -1);
