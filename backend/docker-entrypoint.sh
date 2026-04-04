#!/bin/sh
set -e

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --no-interaction
fi

# Run migrations
php artisan migrate --force --no-interaction

# Create storage symlink
php artisan storage:link --no-interaction 2>/dev/null || true

# Cache config, routes, vues et events (toujours actif)
php artisan config:cache --no-interaction 2>/dev/null || true
php artisan route:cache  --no-interaction 2>/dev/null || true
php artisan view:cache   --no-interaction 2>/dev/null || true
php artisan event:cache  --no-interaction 2>/dev/null || true

exec "$@"
