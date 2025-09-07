#!/bin/bash
echo "Seeding staging database with test accounts..."

# This script should be run in Railway's environment
npx prisma migrate deploy
npx prisma db seed

echo "Staging database seeded successfully!"
echo "Test accounts:"
echo "  Admin: admin@ptsession.com / admin123"
echo "  Manager: manager@woodsquare.com / manager123" 
echo "  PT Manager: ptmanager@ptsession.com / manager123"
echo "  Trainer: john@woodsquare.com / trainer123"
