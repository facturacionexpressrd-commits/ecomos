import crypto from "crypto";

/**
 * Meta Graph API client for EcomOS
 * Handles OAuth and API calls to Meta Ads Manager
 */

const META_API_VERSION = "v18.0";
const META_GRAPH_API_BASE = `https://graph.instagram.com/${META_API_VERSION}`;

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

export class MetaClient {
  private config: MetaOAuthConfig;

  constructor(config: MetaOAuthConfig) {
    this.config = config;
  }

  /**
   * Get OAuth authorization URL
   * User will be redirected to Meta to grant permissions
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: "ads_read", // Read campaigns, spend, results
      response_type: "code",
      state: this.generateState(),
    });

    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
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

    const response = await fetch(`https://graph.instagram.com/${META_API_VERSION}/oauth/access_token`, {
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
    const response = await fetch(
      `${META_GRAPH_API_BASE}/${businessId}/adaccounts?access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Meta ad accounts");
    }

    const data = (await response.json()) as { data: MetaAdAccount[] };
    return data.data;
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(
    adAccountId: string,
    accessToken: string
  ): Promise<Array<{
    id: string;
    name: string;
    status: string;
    objective: string;
    spend: string;
    impressions: string;
    actions: Array<{ action_type: string; value: string }>;
  }>> {
    const fields = "id,name,status,objective,spend,impressions,actions";
    const response = await fetch(
      `${META_GRAPH_API_BASE}/${adAccountId}/campaigns?fields=${fields}&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Meta campaigns");
    }

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        status: string;
        objective: string;
        spend: string;
        impressions: string;
        actions: Array<{ action_type: string; value: string }>;
      }>;
    };
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

  private generateState(): string {
    return crypto.randomBytes(16).toString("hex");
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
