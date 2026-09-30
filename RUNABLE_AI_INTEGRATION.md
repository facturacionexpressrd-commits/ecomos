# Runable AI Integration for EcomOS

**Status:** Architecture & Implementation Plan  
**Date:** September 29, 2026  
**Integration Level:** Third-party agentic AI with Meta Ads automation

---

## Overview

Integrate **Runable AI** as an autonomous agent orchestration layer in EcomOS to:
1. Automate Shopify product optimization
2. Autonomously manage Meta Ad campaigns (create, optimize, pause, adjust budgets)
3. Generate AI product copy and ad creatives
4. Monitor campaign performance and auto-adjust
5. Respond to customer inquiries automatically

**Architecture:** EcomOS ←→ Runable AI ←→ Meta Ads API + Shopify API

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│          EcomOS Dashboard (Frontend)            │
│  (User configures Runable agents)               │
└────────────────┬────────────────────────────────┘
                 │
                 ├─► Agent Configuration
                 ├─► View Agent Results
                 └─► Pause/Resume Agents
                 │
┌────────────────▼────────────────────────────────┐
│     EcomOS Backend (Next.js)                    │
│  • /api/agents/* (CRUD)                        │
│  • /api/runable/* (webhooks & callbacks)       │
│  • /api/meta/* (pass-through to Meta API)      │
│  • /api/shopify/* (sync with Shopify)          │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴────────┬──────────────┐
         │                │              │
    Supabase DB      Runable AI      Meta Ads API
    (PostgreSQL)     (Agent Exec)    (Campaigns)
         │                │              │
         └───────┬────────┴──────────────┘
                 │
          Shopify API
        (Products/Orders)
```

---

## Phase 1: Integration Setup (Week 1)

### 1.1 Database Schema

```sql
-- Track Runable agent connections
CREATE TABLE runable_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_id text NOT NULL, -- Runable AI agent ID
  agent_name text NOT NULL,
  agent_type text NOT NULL, -- 'campaign_manager', 'product_copy', 'performance_optimizer', etc
  status text NOT NULL DEFAULT 'active', -- active, paused, archived
  config jsonb NOT NULL, -- Runable AI workflow config
  runable_api_key text NOT NULL ENCRYPTED, -- encrypted at rest
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(business_id, agent_id)
);

-- Track agent execution history
CREATE TABLE runable_agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES runable_agents(id),
  execution_id text NOT NULL, -- Runable execution ID
  status text NOT NULL, -- pending, running, completed, failed
  input_data jsonb,
  output_data jsonb,
  error_message text,
  meta_actions jsonb, -- List of Meta Ads actions taken
  started_at timestamp,
  completed_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Track what actions agents took
CREATE TABLE agent_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES runable_agents(id),
  action_type text NOT NULL, -- 'campaign_created', 'budget_updated', 'campaign_paused', etc
  target_id text, -- Meta campaign ID or Shopify product ID
  action_data jsonb,
  status text NOT NULL, -- success, failed
  error_message text,
  created_at timestamp DEFAULT now(),
  INDEX(agent_id, created_at),
  INDEX(business_id, created_at)
);
```

### 1.2 Environment Variables

```bash
# Runable AI Configuration
RUNABLE_API_KEY=ru_xxxxxxxxxxxxx                    # Master API key for Runable
RUNABLE_API_URL=https://api.runable.ai             # Runable API endpoint
RUNABLE_WEBHOOK_SECRET=xxx                         # For webhook signature verification

# Callback URL for Runable to report back
RUNABLE_CALLBACK_URL=https://ecomos-omega.vercel.app/api/runable/webhook
```

---

## Phase 2: API Implementation (Week 2)

### 2.1 Agent Management Endpoints

```typescript
// src/app/api/agents/runable/route.ts

/**
 * POST /api/agents/runable
 * Create a new Runable agent
 */
export async function POST(req: Request) {
  const { agentType, name, config } = await req.json();
  const business = await requireActiveBusiness();

  // 1. Create Runable agent via Runable AI API
  const runableAgent = await createRunableAgent({
    type: agentType, // 'campaign_manager', 'product_copy', etc
    name,
    config, // Runable workflow definition
    webhook_url: `${RUNABLE_CALLBACK_URL}/webhook`
  });

  // 2. Store in EcomOS database
  const agent = await db.runable_agents.create({
    business_id: business.id,
    agent_id: runableAgent.id,
    agent_name: name,
    agent_type: agentType,
    config,
    runable_api_key: business.runable_api_key
  });

  return Response.json(agent);
}

/**
 * GET /api/agents/runable
 * List all Runable agents for business
 */
export async function GET(req: Request) {
  const business = await requireActiveBusiness();
  
  const agents = await db.runable_agents.findMany({
    where: { business_id: business.id }
  });

  return Response.json(agents);
}

/**
 * GET /api/agents/runable/[agentId]
 * Get single agent + execution history
 */
export async function GET(req: Request, { params }: any) {
  const business = await requireActiveBusiness();
  const agent = await getAgentWithPermission(params.agentId, business.id);

  const executions = await db.runable_agent_executions.findMany({
    where: { agent_id: agent.id },
    orderBy: { created_at: 'desc' },
    take: 20
  });

  return Response.json({ agent, executions });
}

/**
 * PATCH /api/agents/runable/[agentId]
 * Update agent (pause, resume, edit config)
 */
export async function PATCH(req: Request, { params }: any) {
  const business = await requireActiveBusiness();
  const { status, config } = await req.json();

  const agent = await db.runable_agents.update({
    where: { id: params.agentId },
    data: { status, config, updated_at: new Date() }
  });

  return Response.json(agent);
}
```

### 2.2 Webhook Handler (Runable → EcomOS)

```typescript
// src/app/api/runable/webhook/route.ts

/**
 * POST /api/runable/webhook
 * Runable AI sends execution results here
 */
export async function POST(req: Request) {
  const signature = req.headers.get('x-runable-signature');
  const body = await req.text();

  // 1. Verify webhook signature
  if (!verifyRunableSignature(body, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = JSON.parse(body);
  const { execution_id, agent_id, status, output } = payload;

  // 2. Store execution result
  const execution = await db.runable_agent_executions.update({
    where: { execution_id },
    data: {
      status,
      output_data: output,
      completed_at: new Date()
    }
  });

  // 3. Process agent output and take actions
  if (status === 'completed') {
    await processAgentOutput(execution, output);
  }

  return Response.json({ success: true });
}

/**
 * Process agent output and take real-world actions
 */
async function processAgentOutput(execution: any, output: any) {
  const agent = await db.runable_agents.findUnique({
    where: { id: execution.agent_id }
  });

  switch (agent.agent_type) {
    case 'campaign_manager':
      await handleCampaignManagerActions(agent, output);
      break;
    case 'product_copy':
      await handleProductCopyActions(agent, output);
      break;
    case 'performance_optimizer':
      await handlePerformanceOptimization(agent, output);
      break;
  }
}
```

### 2.3 Campaign Manager Agent

```typescript
// src/lib/runable/agents/campaign-manager.ts

/**
 * Campaign Manager Agent
 * Runable AI autonomously creates/optimizes Meta Ad campaigns
 */

export const CAMPAIGN_MANAGER_WORKFLOW = {
  name: 'Meta Ads Campaign Manager',
  triggers: [
    {
      type: 'webhook',
      event: 'new_product', // When product added to Shopify
      handler: 'auto_create_campaign'
    },
    {
      type: 'schedule',
      cron: '0 * * * *', // Every hour
      handler: 'check_performance'
    }
  ],
  actions: [
    {
      id: 'auto_create_campaign',
      description: 'Auto-create Meta campaign for new products',
      steps: [
        {
          service: 'shopify',
          action: 'get_new_products',
          config: { since: '1h_ago' }
        },
        {
          service: 'claude_ai',
          action: 'generate_campaign_copy',
          input: '${shopify.product}'
        },
        {
          service: 'meta_ads',
          action: 'create_campaign',
          input: {
            name: 'Auto: ${product.title}',
            budget: '${config.daily_budget}',
            copy: '${ai.copy}',
            audiences: '${config.target_audiences}'
          }
        },
        {
          service: 'ecomos',
          action: 'log_action',
          input: {
            type: 'campaign_created',
            meta_campaign_id: '${meta.campaign_id}'
          }
        }
      ]
    },
    {
      id: 'check_performance',
      description: 'Monitor campaigns and auto-optimize',
      steps: [
        {
          service: 'meta_ads',
          action: 'get_campaign_metrics',
          config: { time_range: 'last_24h' }
        },
        {
          service: 'claude_ai',
          action: 'analyze_performance',
          input: '${meta.metrics}'
        },
        {
          service: 'meta_ads',
          action: 'optimize',
          conditionals: [
            {
              condition: 'roas < ${config.min_roas}',
              action: 'pause_campaign',
              reason: 'Below minimum ROAS threshold'
            },
            {
              condition: 'cpc > ${config.max_cpc}',
              action: 'reduce_budget',
              amount: '20%',
              reason: 'CPC too high'
            },
            {
              condition: 'ctr > 3% AND roas > 2',
              action: 'increase_budget',
              amount: '50%',
              reason: 'High performer, scale it'
            }
          ]
        }
      ]
    }
  ]
};

// Runable AI will execute this workflow
// It calls back to EcomOS via webhook with results
```

---

## Phase 3: Agent Types (Weeks 2-3)

### 3.1 Campaign Manager Agent
**Capabilities:**
- Auto-create campaigns for new products
- Monitor performance hourly
- Adjust budgets based on ROAS
- Pause underperforming campaigns
- Duplicate successful campaigns
- A/B test different audiences

**Inputs:**
- Target ROAS threshold
- Min/max daily budget
- Target audiences
- Product categories to exclude

**Actions:**
- `create_campaign` → Meta Ads API
- `update_budget` → Meta Ads API
- `pause_campaign` → Meta Ads API
- `duplicate_campaign` → Meta Ads API

### 3.2 Product Copy Agent
**Capabilities:**
- Generate AI product descriptions
- Create ad headlines and copy
- Optimize for SEO keywords
- Generate multiple variations for A/B testing
- Auto-upload to Meta creatives library

**Process:**
1. Runable AI fetches new/updated products from Shopify
2. Sends to Claude API for copy generation
3. Creates Meta Ad creatives
4. Logs actions in EcomOS

### 3.3 Performance Optimizer Agent
**Capabilities:**
- Analyze campaign metrics every hour
- Recommend budget reallocation
- Identify top-performing creative
- Alert on performance drops
- Auto-adjust targeting based on results

---

## Phase 4: UI Components (Week 3)

### 4.1 Agents Dashboard Page

```typescript
// src/app/(app)/dashboard/agents/page.tsx

export default async function AgentsDashboard() {
  const agents = await getRunableAgents();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <CreateAgentModal />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Active Agents" value={agents.filter(a => a.status === 'active').length} />
        <MetricCard title="Executions Today" value={executionCount} />
        <MetricCard title="Actions Taken" value={actionCount} />
      </div>

      <AgentsList agents={agents} />
      <ExecutionHistory />
    </div>
  );
}
```

### 4.2 Agent Detail Page

```typescript
// src/app/(app)/dashboard/agents/[agentId]/page.tsx

export default async function AgentDetail({ params }: any) {
  const agent = await getAgent(params.agentId);
  
  return (
    <div className="space-y-6">
      <AgentHeader agent={agent} />
      <AgentConfig agent={agent} />
      <AgentPerformanceChart executions={agent.executions} />
      <ExecutionLog executions={agent.executions} />
    </div>
  );
}
```

---

## Phase 5: Integration Checklist

### Setup
- [ ] Create Runable AI account at https://runable.ai
- [ ] Obtain Runable API key
- [ ] Add to Vercel environment variables
- [ ] Deploy database migrations

### Implementation
- [ ] Implement agent CRUD endpoints
- [ ] Build webhook handler
- [ ] Add agent execution logging
- [ ] Create action log tracking
- [ ] Implement signature verification

### Testing
- [ ] Test agent creation in Runable UI
- [ ] Verify webhook callbacks
- [ ] Test campaign creation via agent
- [ ] Test performance monitoring
- [ ] Test error handling and retries

### Frontend
- [ ] Build agents dashboard
- [ ] Build agent detail page
- [ ] Build create agent modal
- [ ] Build execution history view
- [ ] Add action audit log viewer

### Documentation
- [ ] Write Runable agent setup guide
- [ ] Create workflow templates
- [ ] Document API integration
- [ ] Create troubleshooting guide

---

## Data Flow Example: Campaign Manager Agent

```
1. User creates "Runable Campaign Manager" agent in EcomOS
   ├─ Stores config: min_roas=2.0, daily_budget=$50, audiences=[...]
   └─ Runable AI initializes workflow

2. Product added to Shopify
   └─ Webhook → Runable AI notified

3. Runable AI executes workflow:
   ├─ Step 1: Fetch product from Shopify API
   ├─ Step 2: Call Claude API to generate copy
   ├─ Step 3: Create Meta campaign with copy
   ├─ Step 4: Call EcomOS webhook: POST /api/runable/webhook
   └─ Step 5: EcomOS logs action in agent_action_log

4. Every hour, Runable checks performance:
   ├─ Fetch Meta campaign metrics
   ├─ Analyze with Claude AI
   ├─ Make optimization decisions
   ├─ Apply changes to Meta campaigns
   └─ Report back to EcomOS

5. Dashboard shows:
   ├─ Campaigns created by agent
   ├─ Performance trends
   ├─ Actions taken
   └─ ROI impact
```

---

## Security Considerations

```typescript
// 1. API Key Encryption
- Store RUNABLE_API_KEY encrypted at rest in Supabase
- Use RBAC to restrict who can view/edit agents

// 2. Webhook Verification
- Verify Runable signature on all webhooks
- Log all webhook payloads for audit

// 3. Action Authorization
- Only Owner/Admin can create agents
- Manager+ can view execution history
- Analyst can view reports only

// 4. Rate Limiting
- Limit agent executions per business (e.g., 1000/day)
- Throttle Meta API calls (respect Meta rate limits)
- Implement exponential backoff for failures

// 5. Audit Trail
- Log all agent-triggered actions
- Track who created/modified agents
- Immutable action log (no deletion, only archival)
```

---

## Cost Analysis

| Component | Cost | Note |
|-----------|------|------|
| Runable AI | $99-500/mo | Depends on execution volume |
| Meta Ads API | Free | (Ad spend is separate) |
| Claude AI | $0.01-0.10/execution | For copy generation, analysis |
| Supabase | Included | (Already in use) |
| **Total/Month** | **$150-650** | Scales with usage |

**ROI Example:**
- Agent creates 50 campaigns/mo
- Each campaign generates 2% incremental revenue
- 10 stores × $5K revenue = $50K → +$1K incremental
- Cost: $300 → **3:1 ROI**

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|------------|
| 1 | 1 week | Database schema + env vars |
| 2 | 1 week | Agent APIs + webhook handler |
| 3 | 1 week | Campaign manager + product copy agents |
| 4 | 1 week | Dashboard UI + monitoring |
| 5 | 1 week | Testing + documentation |
| **Total** | **5 weeks** | **Full Runable AI integration** |

---

## Next Steps

1. **Sign up for Runable AI:** https://runable.ai (get API key)
2. **Review this architecture** with your team
3. **Choose which agent to build first** (recommend: Campaign Manager)
4. **Start Phase 1 implementation**

**Questions?** Let me know and I'll help implement any of these phases.

---

**Status:** Ready to implement 🚀  
**Integration Effort:** 5-6 weeks for full suite  
**Business Impact:** 50%+ time savings on campaign management + improved ROAS
