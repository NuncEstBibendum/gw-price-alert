-- net.http_get defaults to a 5s timeout, but /api/ingest spaces out
-- requests to gwtoolbox (2s between items, plus retry backoff on 429) and
-- can take 40s+ in the worst case for a batch. 55s keeps some margin under
-- Vercel's 60s maxDuration on /api/ingest. Re-registering the job under the
-- same name updates it in place with the new timeout.
select cron.schedule(
  'poll-gw-prices',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://gw-price-alert.vercel.app/api/ingest',
    headers := jsonb_build_object(
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    timeout_milliseconds := 55000
  );
  $$
);
