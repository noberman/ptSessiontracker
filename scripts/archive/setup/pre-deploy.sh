#!/bin/bash

# Pre-deployment Check Script
# Run this before ANY deployment to production

set -e  # Exit on any error

echo "🔍 Running Pre-Deployment Checks..."
echo "=================================="

# 1. Check for uncommitted changes
echo "📝 Checking for uncommitted changes..."
if [[ -n $(git status -s) ]]; then
    echo "❌ You have uncommitted changes!"
    echo "   Please commit or stash your changes before deploying."
    git status -s
    exit 1
else
    echo "✅ Working directory is clean"
fi

# 2. Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Current branch: $CURRENT_BRANCH"

if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "⚠️  Warning: You're not on the main branch"
    read -p "   Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 3. Run TypeScript compilation check
echo "🔨 Checking TypeScript compilation..."
npm run build --silent || {
    echo "❌ TypeScript compilation failed!"
    echo "   Fix the errors above before deploying."
    exit 1
}
echo "✅ TypeScript compilation successful"

# 4. Check Prisma migrations
echo "🗄️  Checking database migrations..."
npx prisma migrate status || {
    echo "❌ Migration check failed!"
    echo "   Run: npx prisma migrate dev"
    exit 1
}

# 5. Run the detailed database check
echo "🔍 Running detailed database checks..."
npx tsx scripts/check-deployment-ready.ts || {
    echo "❌ Database alignment check failed!"
    echo "   Fix the issues above before deploying."
    exit 1
}

echo ""
echo "======================================"
echo "✅ ALL PRE-DEPLOYMENT CHECKS PASSED!"
echo "======================================"
echo ""
echo "Ready to deploy to production!"
echo "Run: git push origin main"
echo ""