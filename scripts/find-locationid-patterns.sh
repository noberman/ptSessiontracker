#!/bin/bash

echo "=== Finding all locationId patterns to update ==="
echo ""

echo "1. Files with user.locationId or session.user.locationId references:"
grep -r "user\.locationId\|session\.user\.locationId" --include="*.ts" --include="*.tsx" src/ | grep -v "UserLocation" | cut -d: -f1 | sort -u

echo ""
echo "2. Files selecting locationId from user queries:"
grep -r "select.*locationId.*true" --include="*.ts" --include="*.tsx" src/ | cut -d: -f1 | sort -u

echo ""
echo "3. Files with OR conditions checking both systems:"
grep -r "OR.*locationId\|locationId.*OR" --include="*.ts" --include="*.tsx" src/ | cut -d: -f1 | sort -u

echo ""
echo "4. Files with locationId in where clauses:"
grep -r "where.*locationId\|locationId:.*session" --include="*.ts" --include="*.tsx" src/ | grep -v "client\.locationId\|session\.locationId\|package\.locationId" | cut -d: -f1 | sort -u

echo ""
echo "Total unique files:"
(grep -r "user\.locationId\|session\.user\.locationId" --include="*.ts" --include="*.tsx" src/ | grep -v "UserLocation" | cut -d: -f1; grep -r "select.*locationId.*true" --include="*.ts" --include="*.tsx" src/ | cut -d: -f1; grep -r "OR.*locationId\|locationId.*OR" --include="*.ts" --include="*.tsx" src/ | cut -d: -f1) | sort -u | wc -l