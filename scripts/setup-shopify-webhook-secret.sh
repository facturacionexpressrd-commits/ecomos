#!/bin/bash
# Setup Shopify Webhook Secret in Vercel Production
# Usage: ./scripts/setup-shopify-webhook-secret.sh
#
# This script:
# 1. Prompts for the Shopify webhook secret (from Partner Dashboard)
# 2. Adds it to Vercel production environment
# 3. Redeploys the app
# 4. Verifies it's set

set -e

echo "=========================================="
echo "EcomOS: Setup Shopify Webhook Secret"
echo "=========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

# Check if already logged in
if ! vercel whoami &> /dev/null; then
    echo "📝 Not logged into Vercel. Running login flow..."
    vercel login
fi

echo ""
echo "📋 To get your Shopify webhook secret:"
echo "   1. Go to https://partners.shopify.com"
echo "   2. Apps → EcomOS → Configuration"
echo "   3. Copy the 'Webhook Secret' value (looks like: shpss_...)"
echo ""

read -p "Enter your Shopify Webhook Secret: " WEBHOOK_SECRET

# Validate format
if [[ ! $WEBHOOK_SECRET =~ ^shpss_ ]]; then
    echo "❌ Invalid format. Secret should start with 'shpss_'"
    exit 1
fi

echo ""
echo "⚙️  Adding SHOPIFY_WEBHOOK_SECRET to Vercel Production..."

# Add to Vercel production environment
vercel env add SHOPIFY_WEBHOOK_SECRET production <<< "$WEBHOOK_SECRET"

echo ""
echo "✅ Secret added to Vercel Production"
echo ""

read -p "Redeploy now? (y/n) " -n 1 -r REPLY
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to production..."
    vercel --prod --yes
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📊 Your webhook is now active at:"
    echo "   https://ecomos-omega.vercel.app/api/webhooks/shopify/products/create"
else
    echo "⚠️  Remember to deploy manually to activate the webhook:"
    echo "   vercel --prod --yes"
fi

echo ""
echo "✅ Setup complete! Shopify webhooks are now ready for production."
