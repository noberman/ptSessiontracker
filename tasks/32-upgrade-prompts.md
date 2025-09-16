# Task 32: Upgrade Prompts & CTAs

**Complexity: 2/10**  
**Priority: HIGH (Revenue Optimization)**  
**Status: Not Started**  
**Dependencies: Task 31 (Usage Limits)**  
**Estimated Time: 2 hours**

## Objective
Add strategic upgrade prompts throughout the app to convert Free users to Pro.

## Implementation Checklist

### Define Upgrade Triggers
- [ ] Create `/src/lib/upgrade-triggers.ts`:
```typescript
export function shouldShowUpgradePrompt(
  usage: UsageMetrics,
  limits: TierLimits,
  lastPromptShown?: Date
): UpgradePromptType | null {
  
  // At limit
  if (usage.trainers >= limits.trainers) {
    return 'TRAINER_LIMIT'
  }
  
  if (usage.sessions >= limits.sessionsPerMonth) {
    return 'SESSION_LIMIT'
  }
  
  // Near limit (80%)
  if (usage.trainers >= limits.trainers * 0.8) {
    return 'TRAINER_WARNING'
  }
  
  if (usage.sessions >= limits.sessionsPerMonth * 0.8) {
    return 'SESSION_WARNING'
  }
  
  // Time-based (been free for 30 days)
  if (daysSinceSignup > 30 && !lastPromptShown) {
    return 'TRIAL_ENDED'
  }
  
  return null
}
```

### Create Upgrade Banner Component
- [ ] Create `/src/components/upgrade/UpgradeBanner.tsx`:
```typescript
function UpgradeBanner({ type }: { type: UpgradePromptType }) {
  const messages = {
    TRAINER_LIMIT: {
      title: "Trainer limit reached",
      message: "Upgrade to Pro to add unlimited trainers",
      cta: "Upgrade Now"
    },
    SESSION_LIMIT: {
      title: "Monthly session limit reached",
      message: "You've used all 50 free sessions this month",
      cta: "Go Unlimited"
    },
    TRAINER_WARNING: {
      title: "Almost at trainer limit",
      message: "You can only add 1 more trainer on the Free plan",
      cta: "Unlock Unlimited"
    },
    SESSION_WARNING: {
      title: "Approaching session limit",
      message: "Only 10 sessions remaining this month",
      cta: "Remove Limits"
    },
    TRIAL_ENDED: {
      title: "Your free trial has ended",
      message: "Upgrade to Pro for unlimited access",
      cta: "Start Pro Plan"
    }
  }
  
  const prompt = messages[type]
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{prompt.title}</h3>
          <p className="text-sm opacity-90">{prompt.message}</p>
        </div>
        <Button variant="white" onClick={handleUpgrade}>
          {prompt.cta}
        </Button>
      </div>
    </div>
  )
}
```

### Add Inline Upgrade Prompts
- [ ] Create `/src/components/upgrade/InlineUpgrade.tsx`:
```typescript
function InlineUpgrade({ context }: { context: string }) {
  const benefits = {
    trainers: [
      "Unlimited trainers",
      "Advanced permissions",
      "Priority support"
    ],
    sessions: [
      "Unlimited sessions",
      "Advanced analytics",
      "Export reports"
    ],
    locations: [
      "Unlimited locations",
      "Multi-location dashboard",
      "Location comparison"
    ]
  }
  
  return (
    <Card className="border-blue-500 bg-blue-50">
      <CardHeader>
        <CardTitle>🚀 Upgrade to Pro</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {benefits[context].map(benefit => (
            <li key={benefit} className="flex items-center">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              {benefit}
            </li>
          ))}
        </ul>
        <Button className="w-full mt-4" onClick={handleUpgrade}>
          Start 14-Day Free Trial
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Add Modal Upgrade Prompt
- [ ] Create `/src/components/upgrade/UpgradeModal.tsx`:
```typescript
function UpgradeModal({ isOpen, onClose, trigger }) {
  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>You've Hit Your Limit</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p>The Free plan includes:</p>
            <ul>
              <li>• 2 trainers</li>
              <li>• 50 sessions/month</li>
              <li>• 1 location</li>
            </ul>
            
            <p className="font-semibold">Upgrade to Pro for:</p>
            <ul>
              <li>✓ Unlimited everything</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced features</li>
            </ul>
            
            <div className="text-center">
              <p className="text-2xl font-bold">$15/month</p>
              <p className="text-sm text-gray-500">Cancel anytime</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade}>
            Upgrade Now
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

### Strategic Placement Locations
- [ ] Dashboard - Top banner when near limits
- [ ] Trainer list - When at limit
- [ ] Session creation - When at monthly limit
- [ ] Location page - When trying to add second location
- [ ] Settings - Persistent upgrade card
- [ ] Reports - "Pro features" locked sections

### Add Feature Gating
- [ ] Create `/src/components/upgrade/ProFeature.tsx`:
```typescript
function ProFeature({ children, feature }) {
  const org = useOrganization()
  
  if (org.subscriptionTier === 'PRO') {
    return children
  }
  
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
        <div className="text-center">
          <Lock className="h-8 w-8 mx-auto mb-2" />
          <p className="font-semibold">Pro Feature</p>
          <Button size="sm" onClick={handleUpgrade}>
            Unlock
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Track Upgrade Events
- [ ] Analytics tracking:
```typescript
function trackUpgradeEvent(event: UpgradeEvent) {
  // Track:
  // - Where shown
  // - What trigger
  // - If clicked
  // - If completed
  
  await fetch('/api/analytics/upgrade', {
    method: 'POST',
    body: JSON.stringify({
      event,
      organizationId,
      trigger,
      location
    })
  })
}
```

### A/B Test Different Messages
- [ ] Create message variants:
```typescript
const ctaVariants = {
  A: "Upgrade Now",
  B: "Start Free Trial",
  C: "Go Unlimited"
}

function getVariant(userId: string): string {
  // Simple hash-based assignment
  return variants[hash(userId) % variants.length]
}
```

## Acceptance Criteria
- [ ] Shows banner at limits
- [ ] Shows warnings near limits
- [ ] Inline prompts in context
- [ ] Modal for hard limits
- [ ] Feature gating works
- [ ] Tracks interactions
- [ ] Not too aggressive

## Testing
- [ ] Approach trainer limit
- [ ] Hit session limit
- [ ] Try gated features
- [ ] Dismiss and re-show
- [ ] Complete upgrade flow

## UX Guidelines
- Don't be annoying
- Max 1 prompt per session
- Allow dismissal
- Remember dismissals
- Context-appropriate messaging
- Clear value proposition

## Notes
- Track conversion rates
- A/B test messages
- Seasonal promotions
- Consider discounts