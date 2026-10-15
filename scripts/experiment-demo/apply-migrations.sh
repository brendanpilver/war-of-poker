#!/bin/sh
# Applies every migration in supabase/migrations, in order, to the demo
# database, then applies 0005 a second time to prove it is idempotent.
set -eu
cd "$(dirname "$0")"
psql() { docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
for file in ../../supabase/migrations/*.sql; do
  name=$(basename "$file")
  echo "applying $name"
  psql -f "/migrations/$name"
done
echo "re-applying 0005_content_experiments.sql (must be a no-op)"
psql -f /migrations/0005_content_experiments.sql
psql -c "NOTIFY pgrst, 'reload schema';"
psql -At -c "select tablename || ' rls=' || rowsecurity from pg_tables where schemaname = 'public' order by 1;"
