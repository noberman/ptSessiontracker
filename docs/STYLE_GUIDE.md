# Style Guide - PT Session Tracker

## Design System Usage

All components and screens MUST use the design system tokens defined in `/docs/design-system.json`. Direct color values (e.g., `bg-blue-500`) are prohibited.

## Color Usage

### Background Colors
- **Primary Background**: `bg-background` (white)
- **Secondary Background**: `bg-background-secondary` (light gray)
- **Tertiary Background**: `bg-background-tertiary` (medium gray)

### Text Colors
- **Primary Text**: `text-text-primary` (dark gray/black)
- **Secondary Text**: `text-text-secondary` (medium gray)
- **Tertiary Text**: `text-text-tertiary` (light gray)
- **Inverse Text**: `text-text-inverse` (white)

### Brand Colors
- **Primary**: `primary-[50-950]` (Blue - #2563EB)
- **Secondary**: `secondary-[50-950]` (Cyan - #0EA5E9)
- **Success**: `success-[50-950]` (Green - #22C55E)
- **Warning**: `warning-[50-950]` (Amber - #F59E0B)
- **Error**: `error-[50-950]` (Red - #EF4444)

## Component Library

### Buttons
```tsx
import { Button } from '@/components/ui/Button'

// Primary button
<Button variant="primary" size="md">Click me</Button>

// Secondary button
<Button variant="secondary" size="lg">Submit</Button>

// Danger button
<Button variant="danger" size="sm">Delete</Button>
```

### Input Fields
```tsx
import { Input } from '@/components/ui/Input'

// Default input
<Input type="text" placeholder="Enter text" />

// Error state
<Input variant="error" type="email" />

// Success state
<Input variant="success" type="password" />
```

### Cards
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card variant="default" padding="lg">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Badges
```tsx
import { Badge } from '@/components/ui/Badge'

// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Expired</Badge>
```

## Typography

### Font Families
- **Sans**: Inter (primary font)
- **Mono**: JetBrains Mono (code/numbers)

### Font Sizes
- `text-xs`: 0.75rem
- `text-sm`: 0.875rem
- `text-base`: 1rem
- `text-lg`: 1.125rem
- `text-xl`: 1.25rem
- `text-2xl`: 1.5rem
- `text-3xl`: 1.875rem

### Font Weights
- `font-normal`: 400
- `font-medium`: 500
- `font-semibold`: 600
- `font-bold`: 700

## Spacing

Use the spacing scale from the design system:
- `p-1`: 0.25rem
- `p-2`: 0.5rem
- `p-3`: 0.75rem
- `p-4`: 1rem
- `p-6`: 1.5rem
- `p-8`: 2rem

## Border Radius

- `rounded-sm`: 0.125rem
- `rounded`: 0.25rem
- `rounded-md`: 0.375rem
- `rounded-lg`: 0.5rem
- `rounded-xl`: 0.75rem
- `rounded-2xl`: 1rem
- `rounded-full`: 9999px

## Shadows

- `shadow-sm`: Small shadow
- `shadow`: Default shadow
- `shadow-md`: Medium shadow
- `shadow-lg`: Large shadow
- `shadow-xl`: Extra large shadow

## Mobile-First Design

### Trainer Interface (Mobile Priority)
- Bottom navigation bar
- Large touch targets (min 44px)
- Single column layouts
- Swipeable cards for sessions
- Floating action buttons

### Manager/Admin Interface (Desktop Priority)
- Collapsible sidebar navigation
- Responsive grid layouts
- Data tables with horizontal scroll
- Multi-column dashboards

## Best Practices

1. **Always use design tokens** - Never hardcode colors
2. **Use semantic color names** - `text-primary` not `text-gray-900`
3. **Maintain consistency** - Use the component library
4. **Mobile-first for trainers** - Design for thumb reach
5. **Accessibility** - Maintain WCAG AA compliance
6. **Performance** - Use Tailwind's purge for production

## Example Screen Structure

```tsx
// Page wrapper
<div className="min-h-screen bg-background-secondary">
  // Container
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
    // Main card
    <Card>
      // Header
      <h1 className="text-2xl font-bold text-text-primary mb-4">
        Page Title
      </h1>
      
      // Content sections
      <div className="space-y-4">
        // Individual cards
        <Card variant="outlined">
          <CardContent>
            // Content
          </CardContent>
        </Card>
      </div>
    </Card>
  </div>
</div>
```

## Migration Checklist

When updating existing screens:
- [ ] Replace hardcoded colors with design tokens
- [ ] Use component library (Button, Input, Card, Badge)
- [ ] Update text colors to semantic names
- [ ] Apply consistent spacing
- [ ] Test on mobile devices
- [ ] Verify accessibility