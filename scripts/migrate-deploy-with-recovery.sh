#!/bin/bash

# Migration deployment script with automatic failed migration recovery
set -e

echo "Starting migration deployment..."

# Set DIRECT_URL to DATABASE_URL if not already set (for Neon compatibility)
if [ -z "$DIRECT_URL" ] && [ -n "$DATABASE_URL" ]; then
    export DIRECT_URL="$DATABASE_URL"
    echo "Set DIRECT_URL to DATABASE_URL for migration compatibility"
fi

# Try to deploy migrations
if npx prisma migrate deploy; then
    echo "Migrations deployed successfully"
    npx prisma generate
    exit 0
fi

echo "Migration deployment failed, checking for failed migrations..."

# Capture the error output from the failed migrate deploy
DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1 || true)

# Extract failed migration name from error message
# Error format: "The `20250905050203_add_folder_position` migration started at ... failed"
FAILED_MIGRATION=$(echo "$DEPLOY_OUTPUT" | grep -oE 'The `[0-9]+_[a-z_]+`' | sed "s/The \`//" | sed "s/\`//" | head -1 || echo "")

# If that didn't work, try parsing migration name pattern directly
if [ -z "$FAILED_MIGRATION" ]; then
    FAILED_MIGRATION=$(echo "$DEPLOY_OUTPUT" | grep -oE '[0-9]{14}_[a-z_]+' | head -1 || echo "")
fi

# Use known failed migration as fallback
if [ -z "$FAILED_MIGRATION" ]; then
    FAILED_MIGRATION="20250905050203_add_folder_position"
    echo "Using known failed migration: $FAILED_MIGRATION"
fi

if [ -n "$FAILED_MIGRATION" ]; then
    echo "Found failed migration: $FAILED_MIGRATION"
    echo "Attempting to resolve by marking as rolled back..."
    
    # Mark the failed migration as rolled back
    if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION"; then
        echo "Failed migration resolved, retrying deployment..."
        
        # Retry migration deployment
        if npx prisma migrate deploy; then
            echo "Migrations deployed successfully after resolution"
            npx prisma generate
            exit 0
        else
            echo "Migration deployment still failed after resolution"
            exit 1
        fi
    else
        echo "Failed to resolve migration: $FAILED_MIGRATION"
        exit 1
    fi
else
    echo "Could not identify failed migration from status output"
    echo "Migration status output:"
    echo "$MIGRATION_STATUS"
    exit 1
fi

