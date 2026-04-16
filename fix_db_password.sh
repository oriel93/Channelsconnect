#!/usr/bin/env bash
# ============================================================
# fix_db_password.sh
# Run this script with the correct Supabase postgres password.
# Usage: ./fix_db_password.sh "YOUR_NEW_DB_PASSWORD"
# ============================================================

set -e

NEW_PASSWORD="${1}"
if [ -z "$NEW_PASSWORD" ]; then
  echo "❌ Usage: $0 <new_supabase_postgres_password>"
  echo ""
  echo "Get your password from:"
  echo "  https://supabase.com/dashboard/project/ncaacrnkdgymcxaxnzcw/settings/database"
  echo "  → Connection string → Transaction pooler → copy the URI"
  exit 1
fi

export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION=us-east-2

CLUSTER="channels-connect-production-ClusterCluster-bbeudonu"
SERVICE="Api"
CURRENT_TASKDEF="channels-connect-production-ClusterCluster-bbeudonu-Api:11"

echo "▶ Fetching current task definition..."
aws ecs describe-task-definition \
  --task-definition "$CURRENT_TASKDEF" \
  --query 'taskDefinition' \
  --output json > /tmp/taskdef_fix.json

echo "▶ Updating DATABASE_URL with new password..."
python3 << PYEOF
import json

with open('/tmp/taskdef_fix.json') as f:
    td = json.load(f)

env = td['containerDefinitions'][0]['environment']
for e in env:
    if e['name'] == 'DATABASE_URL':
        old = e['value']
        # Replace the password portion in the URL
        import re
        new_url = re.sub(
            r'(postgresql://postgres\.[^:]+:)[^@]+(@)',
            r'\g<1>${NEW_PASSWORD}\2',
            old
        )
        new_url = new_url.replace('\${NEW_PASSWORD}', '${NEW_PASSWORD}')
        e['value'] = new_url
        print(f"Updated DATABASE_URL password")
        print(f"New URL (masked): {re.sub(r':([^@]+)@', ':<PASSWORD>@', new_url)}")

# Remove non-serializable fields
for field in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes',
              'placementConstraints', 'compatibilities', 'registeredAt', 'registeredBy',
              'deregisteredAt']:
    td.pop(field, None)

with open('/tmp/taskdef_fix.json', 'w') as f:
    json.dump(td, f)
PYEOF

# Replace the shell variable in the Python-generated file
sed -i "s|\${NEW_PASSWORD}|${NEW_PASSWORD}|g" /tmp/taskdef_fix.json

echo "▶ Registering new task definition..."
NEW_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/taskdef_fix.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)
echo "✅ New task def: $NEW_ARN"

echo "▶ Updating ECS service..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$NEW_ARN" \
  --force-new-deployment \
  --query 'service.{status:status,taskDef:taskDefinition}' \
  --output json

echo ""
echo "✅ Done! Waiting for new task to start (this takes ~60 seconds)..."
echo "   Monitor: https://us-east-2.console.aws.amazon.com/ecs/v2/clusters/${CLUSTER}/services/${SERVICE}"
echo ""
echo "   To check live status run:"
echo "   aws ecs describe-services --cluster $CLUSTER --services $SERVICE --query 'services[0].{running:runningCount,desired:desiredCount}' --region us-east-2"
