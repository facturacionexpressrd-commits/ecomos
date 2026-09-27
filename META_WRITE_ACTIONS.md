# Meta Write Actions — Campaign Creation & Management

**Status:** Session 13 complete. Full write capabilities for campaigns.

## What's Built

### 1. **Campaign Creation Wizard**
Multi-step form to create new Meta campaigns directly from EcomOS:

**Route:** `/dashboard/meta/campaigns/new?storeId={storeId}`

**Steps:**
1. **Campaign Details** — Name (max 100 chars)
2. **Campaign Objective** — LINK_CLICKS, CONVERSIONS, REACH, IMPRESSIONS, VIDEO_VIEWS
3. **Targeting & Audience** — Market (US, CA, UK, AU, Global), Age range (13–65)
4. **Budget & Schedule** — Daily budget (min $1 USD)

**Key Features:**
- All campaigns created in PAUSED state (user must activate after setup)
- Review screen with mandatory user approval before publishing
- Audit logging for every creation

### 2. **Campaign Actions (Read-Only Pause/Activate/Duplicate)**
Right-click menu on campaigns table with three operations:

#### Pause Campaign
**Endpoint:** `POST /api/meta/campaigns/pause`

**Payload:**
```json
{
  "storeId": "store_id",
  "campaignId": "ecomos_campaign_id",
  "metaCampaignId": "meta_campaign_id"
}
```

**Returns:**
```json
{ "ok": true, "status": "PAUSED" }
```

- Pauses campaign in Meta Ads Manager
- Updates status locally in EcomOS
- Logs to audit trail

#### Activate Campaign
**Endpoint:** `POST /api/meta/campaigns/activate`

**Payload:**
```json
{
  "storeId": "store_id",
  "campaignId": "ecomos_campaign_id",
  "metaCampaignId": "meta_campaign_id"
}
```

**Returns:**
```json
{ "ok": true, "status": "ACTIVE" }
```

- Activates (resumes) a paused campaign
- Starts spending from configured budget
- User is responsible for ensuring ad sets + creatives are ready before activating

#### Duplicate Campaign
**Endpoint:** `POST /api/meta/campaigns/duplicate`

**Payload:**
```json
{
  "storeId": "store_id",
  "campaignId": "ecomos_campaign_id",
  "metaCampaignId": "meta_campaign_id",
  "newName": "Copy of original (optional)"
}
```

**Returns:**
```json
{
  "ok": true,
  "campaign": {
    "id": "new_ecomos_campaign_id",
    "metaCampaignId": "new_meta_campaign_id",
    "name": "Copy of...",
    "status": "PAUSED"
  }
}
```

- Creates a copy of the campaign in Meta (paused by default)
- Useful for A/B testing or scaling winners
- New campaign is a clean slate for ad set / creative config

### 3. **Campaign Creation Endpoint**
**Endpoint:** `POST /api/meta/campaigns/create`

Called after wizard completion and review approval.

**Payload:**
```json
{
  "storeId": "store_id",
  "campaignData": {
    "name": "Summer Sale 2024",
    "objective": "LINK_CLICKS",
    "budget": 100
  },
  "reviewApproved": true
}
```

**Returns:**
```json
{
  "ok": true,
  "campaign": {
    "id": "new_campaign_id",
    "metaCampaignId": "meta_campaign_id",
    "name": "Summer Sale 2024",
    "status": "PAUSED",
    "message": "Campaign created in PAUSED state. Edit ad sets and budget, then activate."
  }
}
```

- Creates campaign in Meta (starts PAUSED)
- Stores in EcomOS database
- Logs to audit trail
- Redirects to campaigns page with success message

## User Flow

### Creating a Campaign

1. **Navigate:** Go to `/dashboard/meta/campaigns`
2. **Click:** "+ Create Campaign" button
3. **Fill Wizard:** 4 steps (name, objective, targeting, budget)
4. **Review:** Final approval screen with full campaign summary
5. **Confirm:** Check boxes confirming understanding of:
   - Campaign starts PAUSED
   - Must set up ad sets in Meta Ads Manager
   - Must upload creatives
   - Must activate to start spending
6. **Publish:** Campaign is created in Meta + stored in EcomOS
7. **Edit in Meta:** User continues campaign setup in Meta Ads Manager (creatives, ad sets, final budget tuning)
8. **Activate:** User activates via EcomOS campaigns table or Meta Ads Manager

### Managing Campaigns

From `/dashboard/meta/campaigns` table:

1. **Pause:** Click ⋯ → Pause (stops spending)
2. **Activate:** Click ⋯ → Activate (resumes spending)
3. **Duplicate:** Click ⋯ → Duplicate (creates new paused copy for A/B testing)

All actions log to audit trail.

## Authorization & Security

- **Auth:** Requires valid Supabase session + store access
- **Store Access:** Enforced at every endpoint (capabilities check)
- **Token Encryption:** Meta access token stored encrypted (AES-256-GCM)
- **Audit Logging:** Every action logged with user, timestamp, metadata
- **Scope:** OAuth now requests `ads_read,ads_management` (was `ads_read` only)

## Out of Scope (Session 14+)

- Budget updates via EcomOS (use Meta Ads Manager for now)
- Creative upload/generation (placeholder for AI studio)
- Ad set management (use Meta Ads Manager)
- Conversion tracking pixels
- Audience insights
- Multi-account aggregation

## Implementation Details

### Files Created/Modified

**API Endpoints:**
- `src/app/api/meta/campaigns/pause/route.ts` — Pause campaign
- `src/app/api/meta/campaigns/activate/route.ts` — Activate campaign
- `src/app/api/meta/campaigns/duplicate/route.ts` — Duplicate campaign
- `src/app/api/meta/campaigns/create/route.ts` — Create campaign (final step)

**Components:**
- `src/components/campaigns/CampaignWizard.tsx` — Multi-step wizard form
- `src/components/campaigns/CampaignReview.tsx` — Review + approval screen
- `src/components/campaigns/CampaignActionMenu.tsx` — Pause/activate/duplicate menu
- `src/components/campaigns/CampaignsTable.tsx` — Updated with action column + create button

**Pages:**
- `src/app/dashboard/meta/campaigns/new/page.tsx` — Wizard host page

**Client Library:**
- `src/lib/meta/client.ts` — Added write methods:
  - `createCampaign()`
  - `createAdSet()`
  - `updateCampaign()`
  - `updateAdSet()`

**Auth:**
- `src/app/api/meta/auth/callback/route.ts` — Updated scope to `ads_read,ads_management`

**Docs:**
- `INTEGRATIONS.md` — Added Meta Marketing API write endpoints
- `META_WRITE_ACTIONS.md` — This file

### Database

No schema changes needed — existing MetaCampaign + MetaAccount tables cover the MVP.

**Audit Logging:**
- `meta_campaign_created` — When user publishes a new campaign
- `meta_campaign_paused` — When user pauses
- `meta_campaign_activated` — When user activates
- `meta_campaign_duplicated` — When user duplicates

All logged with full metadata (campaign IDs, names, etc).

## Testing Checklist

- [ ] Meta OAuth connection still works (scope expanded)
- [ ] Can create campaign via wizard (4 steps + review)
- [ ] Campaign appears in campaigns table with PAUSED status
- [ ] Can pause ACTIVE campaign → shows PAUSED
- [ ] Can activate PAUSED campaign → shows ACTIVE
- [ ] Can duplicate campaign → creates new PAUSED copy
- [ ] All actions appear in audit log
- [ ] Review screen prevents publishing until boxes checked
- [ ] Campaign creation redirects with success message
- [ ] Error handling for missing Meta account

## Demo Command

```bash
# Start dev server
npm run dev

# Test campaign creation wizard
# 1. Go to /dashboard/meta/campaigns
# 2. Click "+ Create Campaign"
# 3. Fill in wizard (4 steps)
# 4. Review and approve
# 5. Campaign publishes to Meta + appears in table

# Test pause/activate
# 1. Click ⋯ on a campaign
# 2. Select Pause (if ACTIVE) or Activate (if PAUSED)
# 3. Status updates immediately

# Test duplicate
# 1. Click ⋯ on a campaign
# 2. Select Duplicate
# 3. New campaign appears (PAUSED)
```

## Known Limitations

1. **Budget changes:** Must use Meta Ads Manager (EcomOS is read-only for budget)
2. **Ad sets / creatives:** Must use Meta Ads Manager (not in EcomOS scope)
3. **Multi-account:** Only first account supported (Phase 3)
4. **Deletion:** Campaign cannot be deleted via EcomOS (must use Meta Ads Manager)
5. **Creative upload:** Placeholder for now (AI Creative Studio in Phase 3)

## Next Steps (Phase 3+)

- [ ] Budget change via EcomOS
- [ ] Ad set + creative management in EcomOS
- [ ] AI-generated creative studio
- [ ] Campaign duplication with template option
- [ ] Multi-account support
- [ ] Campaign deletion via EcomOS
- [ ] Bulk campaign actions (pause/activate multiple)
- [ ] Campaign scheduling (start/end dates)
