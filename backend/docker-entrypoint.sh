#!/bin/sh
set -e

echo "⏳ Syncing database schema..."
npx prisma db push --accept-data-loss

echo "✅ Schema sync complete. Starting server..."
exec node dist/main
