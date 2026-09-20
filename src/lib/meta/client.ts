import crypto from "crypto";

/**
 * Meta Graph API client for EcomOS
 * Handles OAuth and API calls to Meta Ads Manager
 */

const META_API_VERSION = "v18.0";
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface MetaAccessTokenResponse {
  access_token: string;
  token_type: string;
}

export interface MetaBusinessAccount {
  id: string;
  name: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  business_name: string;
  account_status: number;
}

export interface MetaCampaignSummary {
  id: string;
  name: string;
  status: string;
  objective: string;
}

/**
 * Marketing API addresses ad accounts as `act_<id>`. The adaccounts edge
 * already returns ids in that form, so only add the prefix when missing.
 */
export function withActPrefix(adAccountId: string): string {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

export class MetaClient {
  private config: MetaOAuthConfig;

  constructor(config: MetaOAuthConfig) {
    this.config = config;
  }

  /**
   * Get OAuth authorization URL
   * User will be redirected to Meta to grant permissions
   *
   * `state` must be persisted by the caller (cookie) and compared against the
   * value Meta echoes back to the callback — otherwise the flow is CSRF-open.
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: "ads_read,ads_manage", // Read + manage campaigns, spend, results, create/edit campaigns
      response_type: "code",
      state,
    });

    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
  }

  static generateState(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<MetaAccessTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      redirect_uri: this.config.redirectUri,
      code,
    });

    const response = await fetch(`${META_GRAPH_API_BASE}/oauth/access_token`, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta OAuth token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user's Meta business accounts
   * Used to select which ad account to connect
   */
  async getBusinessAccounts(accessToken: string): Promise<MetaBusinessAccount[]> {
    const response = await fetch(`${META_GRAPH_API_BASE}/me/businesses?access_token=${accessToken}`);

    if (!response.ok) {
      throw new Error("Failed to fetch Meta business accounts");
    }

    const data = (await response.json()) as { data: MetaBusinessAccount[] };
    return data.data;
  }

  /**
   * Get ad accounts for a business
   */
  async getAdAccounts(
    businessId: string,
    accessToken: string
  ): Promise<MetaAdAccount[]> {
    const fields = "id,name,business_name,account_status";
    const response = await fetch(
      `${META_GRAPH_API_BASE}/${businessId}/adaccounts?fields=${fields}&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Meta ad accounts: ${await response.text()}`);
    }

    const data = (await response.json()) as { data: MetaAdAccount[] };
    return data.data;
  }

  /**
   * Get campaigns for an ad account.
   *
   * Returns metadata only. spend/impressions/actions are *insights* fields and
   * are rejected on the /campaigns edge — read them from getCampaignInsights.
   */
  async getCampaigns(
    adAccountId: string,
    accessToken: string
  ): Promise<MetaCampaignSummary[]> {
    const fields = "id,name,status,objective";
    const response = await fetch(
      `${META_GRAPH_API_BASE}/${withActPrefix(adAccountId)}/campaigns?fields=${fields}&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Meta campaigns: ${await response.text()}`);
    }

    const data = (await response.json()) as { data: MetaCampaignSummary[] };
    return data.data;
  }

  /**
   * Get daily insights for a campaign
   * Used for trend analysis
   */
  async getCampaignInsights(
    campaignId: string,
    accessToken: string,
    dateStart: string,
    dateStop: string
  ): Promise<Array<{
    date_start: string;
    date_stop: string;
    spend: string;
    impressions: string;
    actions: Array<{ action_type: string; value: string }>;
  }>> {
    const params = new URLSearchParams({
      fields: "date_start,date_stop,spend,impressions,actions",
      time_range: JSON.stringify({ since: dateStart, until: dateStop }),
      time_increment: "1",
      access_token: accessToken,
    });

    const response = await fetch(
      `${META_GRAPH_API_BASE}/${campaignId}/insights?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Meta campaign insights");
    }

    const data = (await response.json()) as {
      data: Array<{
        date_start: string;
        date_stop: string;
        spend: string;
        impressions: string;
        actions: Array<{ action_type: string; value: string }>;
      }>;
    };
    return data.data;
  }

  /**
   * Create a new campaign in Meta Ads Manager
   * Requires ads_manage scope
   */
  async createCampaign(
    adAccountId: string,
    accessToken: string,
    campaignData: {
      name: string;
      objective: string;
      status?: string;
      special_ad_categories?: string[];
    }
  ): Promise<{ campaign_id: string }> {
    const formData = new URLSearchParams({
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status || "PAUSED", // Start paused, user must activate
      access_token: accessToken,
    });

    if (campaignData.special_ad_categories?.length) {
      formData.append("special_ad_categories", JSON.stringify(campaignData.special_ad_categories));
    }

    const response = await fetch(
      `${META_GRAPH_API_BASE}/${withActPrefix(adAccountId)}/campaigns`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create Meta campaign: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Create an ad set within a campaign
   * Requires ads_manage scope
   */
  async createAdSet(
    adAccountId: string,
    accessToken: string,
    adSetData: {
      name: string;
      campaign_id: string;
      daily_budget?: number; // in cents
      lifetime_budget?: number; // in cents
      billing_event: string;
      optimization_goal: string;
      targeting: Record<string, unknown>;
      start_time?: number;
      end_time?: number;
      status?: string;
    }
  ): Promise<{ adset_id: string }> {
    const formData = new URLSearchParams({
      name: adSetData.name,
      campaign_id: adSetData.campaign_id,
      billing_event: adSetData.billing_event,
      optimization_goal: adSetData.optimization_goal,
      targeting: JSON.stringify(adSetData.targeting),
      status: adSetData.status || "PAUSED",
      access_token: accessToken,
    });

    if (adSetData.daily_budget) {
      formData.append("daily_budget", adSetData.daily_budget.toString());
    }
    if (adSetData.lifetime_budget) {
      formData.append("lifetime_budget", adSetData.lifetime_budget.toString());
    }
    if (adSetData.start_time) {
      formData.append("start_time", adSetData.start_time.toString());
    }
    if (adSetData.end_time) {
      formData.append("end_time", adSetData.end_time.toString());
    }

    const response = await fetch(
      `${META_GRAPH_API_BASE}/${withActPrefix(adAccountId)}/adsets`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create Meta ad set: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Update a campaign (status, name, budget)
   * Requires ads_manage scope
   */
  async updateCampaign(
    campaignId: string,
    accessToken: string,
    updates: {
      name?: string;
      status?: string;
    }
  ): Promise<{ success: boolean }> {
    const formData = new URLSearchParams({
      access_token: accessToken,
    });

    if (updates.name) formData.append("name", updates.name);
    if (updates.status) formData.append("status", updates.status);

    const response = await fetch(
      `${META_GRAPH_API_BASE}/${campaignId}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update Meta campaign: ${await response.text()}`);
    }

    return { success: true };
  }

  /**
   * Update an ad set (budget, status, timing)
   * Requires ads_manage scope
   */
  async updateAdSet(
    adSetId: string,
    accessToken: string,
    updates: {
      name?: string;
      daily_budget?: number; // in cents
      lifetime_budget?: number; // in cents
      status?: string;
      start_time?: number;
      end_time?: number;
    }
  ): Promise<{ success: boolean }> {
    const formData = new URLSearchParams({
      access_token: accessToken,
    });

    if (updates.name) formData.append("name", updates.name);
    if (updates.daily_budget) formData.append("daily_budget", updates.daily_budget.toString());
    if (updates.lifetime_budget) formData.append("lifetime_budget", updates.lifetime_budget.toString());
    if (updates.status) formData.append("status", updates.status);
    if (updates.start_time) formData.append("start_time", updates.start_time.toString());
    if (updates.end_time) formData.append("end_time", updates.end_time.toString());

    const response = await fetch(
      `${META_GRAPH_API_BASE}/${adSetId}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update Meta ad set: ${await response.text()}`);
    }

    return { success: true };
  }

}

/**
 * Encrypt token for storage
 * Uses TOKEN_ENCRYPTION_KEY from environment
 */
export function encryptToken(token: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(key, "hex");
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt token from storage
 */
export function decryptToken(encryptedToken: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const keyBuffer = Buffer.from(key, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
