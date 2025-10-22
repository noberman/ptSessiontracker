'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { UpgradeButton } from './UpgradeButton'
import { AlertTriangle, Zap, Users, Calendar, MapPin } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UpgradePromptProps {
  type: 'sessions' | 'trainers' | 'locations' | 'general'
  currentUsage?: number
  limit?: number
  blocking?: boolean
}

export function UpgradePrompt({ 
  type, 
  currentUsage, 
  limit,
  blocking = false 
}: UpgradePromptProps) {
  const getIcon = () => {
    switch (type) {
      case 'sessions':
        return <Calendar className="w-6 h-6 text-warning" />
      case 'trainers':
        return <Users className="w-6 h-6 text-warning" />
      case 'locations':
        return <MapPin className="w-6 h-6 text-warning" />
      default:
        return <Zap className="w-6 h-6 text-primary-500" />
    }
  }

  const getMessage = () => {
    switch (type) {
      case 'sessions':
        return {
          title: blocking ? 'Session Limit Reached' : 'Approaching Session Limit',
          description: `You've used ${currentUsage} of ${limit} sessions this month. Upgrade to Professional for unlimited sessions.`,
        }
      case 'trainers':
        return {
          title: blocking ? 'Trainer Limit Reached' : 'Trainer Limit',
          description: `You have ${currentUsage} of ${limit} trainers. Upgrade to Professional for unlimited trainers.`,
        }
      case 'locations':
        return {
          title: 'Location Limit',
          description: 'Upgrade to Professional to add multiple locations.',
        }
      default:
        return {
          title: 'Unlock Professional Features',
          description: 'Get unlimited access to all features with FitSync Professional.',
        }
    }
  }

  const { title, description } = getMessage()
  const scaleFeatures = SUBSCRIPTION_TIERS.SCALE.features

  return (
    <Card className={blocking ? 'border-warning' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {blocking && <AlertTriangle className="w-5 h-5 text-warning" />}
          {getIcon()}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-text-secondary">{description}</p>
        
        <div className="bg-background-secondary rounded-lg p-4">
          <h4 className="font-semibold mb-2">Scale Plan Includes:</h4>
          <ul className="space-y-1 text-sm text-text-secondary">
            {scaleFeatures.slice(0, 5).map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-success-500">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-lg font-semibold text-text-primary">
            Only ${SUBSCRIPTION_TIERS.SCALE.price}/month
          </p>
        </div>
        
        <UpgradeButton className="w-full">
          Upgrade Now
        </UpgradeButton>
      </CardContent>
    </Card>
  )
}