/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Runable AI API Client
 *
 * Handles communication with Runable AI API for agent management
 * and execution tracking
 */

import { createHmac } from 'crypto';

import { RunableApiError, RunableAgentResponse, CreateRunableAgentRequest } from '@/lib/types/runable';

const RUNABLE_API_URL = process.env.RUNABLE_API_URL || 'https://api.runable.ai';
const RUNABLE_API_KEY = process.env.RUNABLE_API_KEY;

if (!RUNABLE_API_KEY) {
  console.warn('RUNABLE_API_KEY not set - Runable AI integration disabled');
}

class RunableClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || RUNABLE_API_KEY || '';
    this.apiUrl = apiUrl || RUNABLE_API_URL;
  }

  /**
   * Create a new Runable AI agent
   */
  async createAgent(request: CreateRunableAgentRequest): Promise<RunableAgentResponse> {
    return this.post('/agents', request);
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<RunableAgentResponse> {
    return this.get(`/agents/${agentId}`);
  }

  /**
   * List all agents
   */
  async listAgents(page: number = 1, perPage: number = 20): Promise<any> {
    return this.get(`/agents?page=${page}&per_page=${perPage}`);
  }

  /**
   * Update agent configuration
   */
  async updateAgent(agentId: string, updates: Partial<CreateRunableAgentRequest>): Promise<RunableAgentResponse> {
    return this.patch(`/agents/${agentId}`, updates);
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    await this.delete(`/agents/${agentId}`);
  }

  /**
   * Get execution history for an agent
   */
  async getExecutionHistory(agentId: string, limit: number = 20): Promise<any> {
    return this.get(`/agents/${agentId}/executions?limit=${limit}`);
  }

  /**
   * Trigger manual agent execution
   */
  async executeAgent(agentId: string, inputData: Record<string, any>): Promise<any> {
    return this.post(`/agents/${agentId}/execute`, { input: inputData });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    return hash === signature;
  }

  /**
   * Helper: Make GET request
   */
  private async get(path: string): Promise<any> {
    return this.request('GET', path);
  }

  /**
   * Helper: Make POST request
   */
  private async post(path: string, data: any): Promise<any> {
    return this.request('POST', path, data);
  }

  /**
   * Helper: Make PATCH request
   */
  private async patch(path: string, data: any): Promise<any> {
    return this.request('PATCH', path, data);
  }

  /**
   * Helper: Make DELETE request
   */
  private async delete(path: string): Promise<any> {
    return this.request('DELETE', path);
  }

  /**
   * Core request handler
   */
  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Runable API key not configured');
    }

    const url = `${this.apiUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EcomOS/1.0'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error: RunableApiError = await response.json();
        throw new Error(
          `Runable API error: ${error.code} - ${error.message}`
        );
      }

      if (method === 'DELETE') {
        return { success: true };
      }

      return response.json();
    } catch (error) {
      console.error(`Runable API request failed: ${method} ${url}`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const runableClient = new RunableClient();

// Export class for testing
export default RunableClient;
