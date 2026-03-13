#!/usr/bin/env bash
# PM2-B: Content Map Builder
# Scans articles/, assigns clusters, checks for Related Reading, builds content-map.json

REPO="/Users/mike/zovo-workspaces/pm2-seo"
STATUS_LOG="/Users/mike/zovo-oss/minimax-fleet/state/agent-status.md"
OUTPUT="$REPO/_data/content-map.json"

build_content_map() {
  local generated
  generated=$(date '+%Y-%m-%d %H:%M')

  # Get all non-hub md files
  local files=()
  while IFS= read -r f; do
    files+=("$f")
  done < <(ls "$REPO/articles/"*.md 2>/dev/null | grep -v 'hub\.md$')

  local total="${#files[@]}"

  # Build JSON articles array
  local articles_json=""
  local first=1

  for filepath in "${files[@]}"; do
    local filename
    filename=$(basename "$filepath")
    local slug="${filename%.md}"

    # Extract title from front matter
    local title
    title=$(grep -m1 '^title:' "$filepath" 2>/dev/null | sed 's/^title:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//' | sed "s/^'//; s/'$//")
    if [[ -z "$title" ]]; then
      title="$slug"
    fi

    # Extract description from front matter
    local description
    description=$(grep -m1 '^description:' "$filepath" 2>/dev/null | sed 's/^description:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//' | sed "s/^'//; s/'$//")

    # Assign cluster based on filename pattern matching
    local cluster="best-of"
    local fn_lower
    fn_lower=$(echo "$filename" | tr '[:upper:]' '[:lower:]')

    # Check patterns in order (most specific first)
    if echo "$fn_lower" | grep -qE 'vs|comparison|cursor|gpt|copilot|replit|amazon|windsurf|bolt'; then
      cluster="comparisons"
    elif echo "$fn_lower" | grep -qE 'skill.*format|write.*skill|skill.*md|yaml|front.matter'; then
      cluster="getting-started"
    elif echo "$fn_lower" | grep -qE 'auto.invoc|how.*work|what.*is|getting.started|install'; then
      cluster="getting-started"
    elif echo "$fn_lower" | grep -qE 'troubleshoot|fix-guide|debug.*step|crash.*debug|permission.*denied|infinite.*loop|slow.*performance|not.*showing|not.*saving|not.*triggering|output.*format.*broken|permission.*scope'; then
      cluster="troubleshooting"
    elif echo "$fn_lower" | grep -qE 'n8n|zapier|notion|linear|supabase|github.*action|gitlab|jenkins|slack.*integration|airtable|monday|hubspot|discord.*bot|webhook|api.*integration'; then
      cluster="integrations"
    elif echo "$fn_lower" | grep -qE 'error|fix|debug|crash|troubleshoot|permission|not.work'; then
      cluster="getting-started"
    elif echo "$fn_lower" | grep -qE 'tdd|test|automat|pipeline|ci-cd|review'; then
      cluster="workflows"
    elif echo "$fn_lower" | grep -qE 'contribute|open.source|share|publish|community'; then
      cluster="workflows"
    elif echo "$fn_lower" | grep -qE 'mcp|server|protocol|agent|orchestrat|subagent|multi.agent'; then
      cluster="advanced"
    elif echo "$fn_lower" | grep -qE 'token|cost|optim|context|window|memory|supermemory'; then
      cluster="advanced"
    elif echo "$fn_lower" | grep -qE 'frontend|ui|react|design|canvas|theme'; then
      cluster="use-cases"
    elif echo "$fn_lower" | grep -qE 'devops|deploy|infra|terraform|docker|kubernetes'; then
      cluster="use-cases"
    elif echo "$fn_lower" | grep -qE 'data|xlsx|spreadsheet|analysis|report|pdf'; then
      cluster="use-cases"
    elif echo "$fn_lower" | grep -qE 'best.*skill|top.*skill|2026'; then
      cluster="best-of"
    fi

    # Check for Related Reading section
    local linked="false"
    if grep -q '## Related Reading' "$filepath" 2>/dev/null; then
      linked="true"
    fi

    # Build URL
    local url="/claude-skills-guide/articles/${slug}/"

    # Escape title and description for JSON
    local title_escaped
    title_escaped=$(echo "$title" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')

    # Append to JSON
    if [[ $first -eq 1 ]]; then
      first=0
    else
      articles_json="${articles_json},"
    fi

    articles_json="${articles_json}
    {
      \"filename\": \"${filename}\",
      \"title\": \"${title_escaped}\",
      \"url\": \"${url}\",
      \"cluster\": \"${cluster}\",
      \"linked\": ${linked}
    }"
  done

  # Write the JSON file
  cat > "$OUTPUT" <<EOF
{
  "generated": "${generated}",
  "total": ${total},
  "articles": [${articles_json}
  ]
}
EOF

  echo "$total"
}

# Run one cycle
cd "$REPO" || exit 1

# Step 1: Pull latest
git pull --rebase origin main 2>/dev/null || (git rebase --abort 2>/dev/null && git merge origin/main -X theirs --no-edit 2>/dev/null)

# Step 2-6: Build the content map
MAPPED=$(build_content_map)

# Step 7: Commit and push
git add _data/content-map.json

ARTICLE_COUNT=$(ls articles/*.md 2>/dev/null | grep -v hub | wc -l | tr -d ' ')
git commit -m "data: update content-map.json — ${ARTICLE_COUNT} articles mapped"

for i in {1..8}; do
  git pull --rebase origin main 2>/dev/null && git push origin main && break
  git rebase --abort 2>/dev/null
  sleep 2
done

# Step 8: Log status
echo "[$(date '+%H:%M:%S')] PM2-B: content-map updated, ${MAPPED} articles mapped" >> "$STATUS_LOG"

echo "Done: ${MAPPED} articles mapped"
