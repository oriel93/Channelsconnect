#!/usr/bin/env bash
# =============================================================================
# deploy_sync_v2.sh
# Copies the new files into your repo, creates the branch, and commits.
# Run from the root of your project repo.
# =============================================================================

set -e

BRANCH="fix/channex-sync-refactor"
FILES=("sync_service_v2.js" "sync_service_v2.test.js")

echo "▶ Creating branch: $BRANCH"
git checkout -b "$BRANCH"

echo "▶ Copying new files..."
for f in "${FILES[@]}"; do
  # Adjust destination path to match your project structure, e.g. src/services/
  cp "$f" "./src/services/$f" 2>/dev/null || cp "$f" "./$f"
done

echo "▶ Staging files..."
git add sync_service_v2.js sync_service_v2.test.js
# If you placed them in src/services/:
# git add src/services/sync_service_v2.js src/services/sync_service_v2.test.js

echo "▶ Committing..."
git commit -m "feat: self-healing Channex sync engine (v2)

- MappingService: validates room_type_id/property_id before push;
  triggers FetchMappings when any ID is missing
- QueueService: SQS-first with DB fallback; last-write-wins dedup
  per (room_type_id, date) to prevent redundant rate pushes
- ARIPushService: exponential-backoff retry; 422/409 conflict
  resolution fetches Channex ground truth and reconciles local cache
- SyncOrchestrator.applyChange: atomic transaction — DB write only
  commits if queue enqueue succeeds
- 3 unit tests: success path, timeout retry, invalid ID handling
- SyncOrchestrator.runParityCheck: samples N rooms vs Channex live

Closes #channex-sync-drift"

echo ""
echo "✅ Done. To review the diff before pushing:"
echo ""
echo "  git diff main...$BRANCH"
echo ""
echo "To push and open a PR:"
echo ""
echo "  git push origin $BRANCH"
echo "  gh pr create --base main --head $BRANCH --title 'fix: self-healing Channex sync (v2)' --body 'See commit message for full breakdown.'"
echo ""
echo "To run tests:"
echo ""
echo "  npx jest sync_service_v2.test.js --verbose --coverage"
echo ""
echo "To run the parity check against live Channex data:"
echo ""
echo "  node -e \"
    require('dotenv').config();
    const { SyncOrchestrator } = require('./sync_service_v2');
    SyncOrchestrator.runParityCheck(10).then(r => {
      console.log(JSON.stringify(r, null, 2));
      console.log('\\n=== SYNC PARITY: ' + r.parity_pct + '% ===');
      process.exit(0);
    }).catch(e => { console.error(e); process.exit(1); });
  \""
