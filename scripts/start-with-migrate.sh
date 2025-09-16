#!/bin/bash
echo "🔧 Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migration failed, but continuing to start the app..."
fi

echo "🚀 Starting application..."
npm run start