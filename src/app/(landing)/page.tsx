import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { 
  CheckCircle, 
  Users, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Mail, 
  Shield,
  Clock,
  Smartphone,
  TrendingUp
} from 'lucide-react'

export default function LandingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.fitsync.io'
  
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border-light">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image 
                src="/Logo-Icon.svg" 
                alt="FitSync" 
                width={150} 
                height={40}
                className="h-10 w-auto"
                priority
              />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-text-secondary hover:text-primary-700 transition-colors">
                Features
              </Link>
              <Link href="#benefits" className="text-text-secondary hover:text-primary-700 transition-colors">
                Benefits
              </Link>
              <Link href="#pricing" className="text-text-secondary hover:text-primary-700 transition-colors">
                Pricing
              </Link>
              <Link href="#contact" className="text-text-secondary hover:text-primary-700 transition-colors">
                Contact
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`${appUrl}/login`}>
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href={`${appUrl}/login`}>
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-primary-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
              Transform Your Personal Training Business
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto">
              Say goodbye to paper forms and manual calculations. FitSync digitizes session tracking, 
              automates client validation, and streamlines commission payouts for personal trainers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`${appUrl}/login`}>
                <Button size="xl" className="min-w-[200px]">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="outline" size="xl" className="min-w-[200px]">
                  Watch Demo
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-text-tertiary">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background-secondary">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700">100%</div>
              <div className="text-sm text-text-secondary mt-1">Paperless</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700">80%</div>
              <div className="text-sm text-text-secondary mt-1">Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700">90%+</div>
              <div className="text-sm text-text-secondary mt-1">Validation Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700">Zero</div>
              <div className="text-sm text-text-secondary mt-1">Calculation Errors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything You Need to Manage Sessions
            </h2>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto">
              Built specifically for personal trainers and fitness clubs to streamline operations
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 border border-border-light hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Digital Session Logging</h3>
              <p className="text-text-secondary">
                Log sessions instantly from any device. No more paper forms or manual Excel entries.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border-light hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Automated Client Validation</h3>
              <p className="text-text-secondary">
                Clients confirm sessions via email with one click. Build trust and accountability.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border-light hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Commission Tracking</h3>
              <p className="text-text-secondary">
                Automatic tier-based commission calculations. Know exactly what you&apos;ve earned.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border-light hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Client Management</h3>
              <p className="text-text-secondary">
                Track packages, sessions remaining, and maintain complete client histories.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border-light hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
              <p className="text-text-secondary">
                Dashboard views for trainers, managers, and admins with role-based insights.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border-light hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Audit Trail</h3>
              <p className="text-text-secondary">
                Complete tracking of all changes for compliance and dispute resolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-6 bg-background-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                Why Fitness Clubs Choose FitSync
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <CheckCircle className="w-6 h-6 text-success-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Eliminate Manual Errors</h3>
                    <p className="text-text-secondary">
                      Automated calculations mean perfect accuracy every time, no more payroll disputes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="w-6 h-6 text-success-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Save 10+ Hours Monthly</h3>
                    <p className="text-text-secondary">
                      HR teams report 80% reduction in time spent on payroll calculations.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Smartphone className="w-6 h-6 text-success-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Mobile-First Design</h3>
                    <p className="text-text-secondary">
                      Trainers log sessions instantly from the gym floor on any device.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <TrendingUp className="w-6 h-6 text-success-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Boost Trainer Motivation</h3>
                    <p className="text-text-secondary">
                      Real-time commission tracking drives performance and transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary-700 mb-4">ROI</div>
                <div className="text-2xl font-semibold mb-2">Return on Investment</div>
                <div className="text-text-secondary">
                  Most clubs see positive ROI within the first month through time savings alone.
                </div>
                <div className="mt-6 pt-6 border-t border-border-light">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-text-primary">Setup Time</div>
                      <div className="text-text-secondary">Under 1 hour</div>
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">Training Required</div>
                      <div className="text-text-secondary">Minimal</div>
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">Support</div>
                      <div className="text-text-secondary">24/7 Available</div>
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">Data Security</div>
                      <div className="text-text-secondary">Enterprise Grade</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary-700">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Training Business?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join fitness clubs that have already eliminated paper tracking
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`${appUrl}/login`}>
              <Button size="xl" variant="secondary" className="min-w-[200px]">
                Start Free Trial
              </Button>
            </Link>
            <Link href="#contact">
              <Button size="xl" variant="outline" className="min-w-[200px] bg-white/10 text-white border-white/30 hover:bg-white/20">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image 
                src="/Logo-Icon.svg" 
                alt="FitSync" 
                width={120} 
                height={30}
                className="h-8 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-sm">
                Personal Training Session Tracker
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#demo" className="hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#about" className="hover:text-white">About</Link></li>
                <li><Link href="#contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@fitsync.io" className="hover:text-white">support@fitsync.io</a></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2024 FitSync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}