#!/bin/bash

echo "🚀 Stripe Webhook Testing Guide"
echo "================================"
echo ""
echo "1. Install Stripe CLI (if not already installed):"
echo "   brew install stripe/stripe-cli/stripe"
echo ""
echo "2. Login to Stripe:"
echo "   stripe login"
echo ""
echo "3. Forward webhooks to your local server:"
echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo ""
echo "4. Copy the webhook signing secret shown and add to .env.local:"
echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "5. Restart your Next.js dev server"
echo ""
echo "6. In another terminal, trigger test events:"
echo "   stripe trigger checkout.session.completed"
echo "   stripe trigger customer.subscription.updated"
echo ""
echo "================================"
echo ""
echo "Ready to run? Press Enter to start webhook forwarding..."
read

stripe listen --forward-to localhost:3000/api/stripe/webhook