#!/bin/bash

echo "=== Updating Frontend Files to Remove locationId Checks ==="

# List of files that need updating
files=(
  "src/app/(authenticated)/clients/new/page.tsx"
  "src/app/(authenticated)/clients/page.tsx"
  "src/app/(authenticated)/sessions/new/page.tsx"
  "src/app/(authenticated)/sessions/page.tsx"
  "src/app/(authenticated)/packages/new/page.tsx"
  "src/app/(authenticated)/packages/page.tsx"
  "src/app/(authenticated)/users/[id]/edit/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    
    # Remove locationId: true from select
    sed -i '' '/locationId: true,$/d' "$file"
    
    # Remove the if statement checking user?.locationId
    sed -i '' '/if (user?.locationId) {$/,/^    }$/d' "$file"
    
    echo "✓ Updated $file"
  fi
done

echo "=== Done ==="