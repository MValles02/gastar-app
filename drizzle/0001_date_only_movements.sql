UPDATE "movements"
SET "occurred_at" = (("occurred_at" AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::timestamp
  AT TIME ZONE 'America/Argentina/Buenos_Aires'
WHERE ("occurred_at" AT TIME ZONE 'America/Argentina/Buenos_Aires')::time <> '00:00:00';
