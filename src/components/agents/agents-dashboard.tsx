/**
 * Runable Agents Dashboard
 *
 * Display all agents, their status, recent executions, and metrics
 */

'use client';

import { useEffect, useState } from 'react';
import type { AgentSummary } from '@/lib/types/runable';

interface Agent extends AgentSummary {
  id: string;
}

export function AgentsDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'metrics'>('agents');

  // Fetch agents
  useEffect(() => {
    fetchAgents();
    // Poll every 30 seconds
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAgents() {
    try {
      const response = await fetch('/api/agents/runable');
      if (!response.ok) throw new Error('Failed to fetch agents');

      const data = await response.json();
      setAgents(data.agents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-gray-600 mt-1">Autonomous campaign management</p>
        </div>
        <button
          onClick={fetchAgents}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          title="Active Agents"
          value={agents.filter(a => a.status === 'active').length}
          icon="🤖"
        />
        <SummaryCard
          title="Total Executions"
          value={agents.reduce((sum, a) => sum + (a.metrics?.totalExecutions || 0), 0)}
          icon="⚡"
        />
        <SummaryCard
          title="Actions Taken"
          value={agents.reduce((sum, a) => sum + (a.metrics?.totalActionsTaken || 0), 0)}
          icon="✓"
        />
        <SummaryCard
          title="Success Rate"
          value={`${Math.round(
            agents.reduce((sum, a) => sum + (a.metrics?.successRate || 0), 0) / agents.length || 0
          )}%`}
          icon="📊"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'agents'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Agents ({agents.length})
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'metrics'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Metrics
        </button>
      </div>

      {/* Content */}
      {activeTab === 'agents' ? (
        <AgentsList agents={agents} />
      ) : (
        <MetricsView agents={agents} />
      )}
    </div>
  );
}

// ============================================================================
// Summary Card Component
// ============================================================================

function SummaryCard({
  title,
  value,
  icon
}: {
  title: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

// ============================================================================
// Agents List Component
// ============================================================================

function AgentsList({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No agents created yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {agents.map(agent => (
        <div key={agent.id} className="bg-white rounded-lg p-6 shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{agent.name}</h3>
              <p className="text-gray-600 text-sm">{agent.type}</p>
            </div>
            <StatusBadge status={agent.status} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <MetricItem
              label="Success Rate"
              value={`${Math.round(agent.metrics?.successRate || 0)}%`}
            />
            <MetricItem
              label="Executions"
              value={agent.metrics?.totalExecutions || 0}
            />
            <MetricItem
              label="Actions Taken"
              value={agent.metrics?.totalActionsTaken || 0}
            />
          </div>

          {agent.lastExecution && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-600">
                Last execution:{' '}
                {new Date(agent.lastExecution.completedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Metrics View Component
// ============================================================================

function MetricsView({ agents }: { agents: Agent[] }) {
  const totalExecutions = agents.reduce((sum, a) => sum + (a.metrics?.totalExecutions || 0), 0);
  const avgSuccessRate = agents.length > 0
    ? Math.round(agents.reduce((sum, a) => sum + (a.metrics?.successRate || 0), 0) / agents.length)
    : 0;
  const totalSuccessful = Math.round((totalExecutions * avgSuccessRate) / 100);
  const totalFailed = totalExecutions - totalSuccessful;

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
        <div className="grid grid-cols-3 gap-6">
          <MetricItem
            label="Total Executions"
            value={totalExecutions}
          />
          <MetricItem
            label="Successful"
            value={totalSuccessful}
            subtext="100%"
          />
          <MetricItem
            label="Failed"
            value={totalFailed}
            subtext="0%"
          />
        </div>

        {totalExecutions > 0 && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${totalSuccessful > 0 ? (totalSuccessful / totalExecutions) * 100 : 0}%`
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Success rate: {totalExecutions > 0 ? Math.round((totalSuccessful / totalExecutions) * 100) : 0}%
            </p>
          </div>
        )}
      </div>

      {/* Per-Agent Metrics */}
      <div className="grid grid-cols-2 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-white rounded-lg p-6 shadow">
            <h4 className="font-semibold mb-4">{agent.name}</h4>
            <div className="space-y-3">
              <MetricRow
                label="Executions"
                value={agent.metrics?.totalExecutions || 0}
              />
              <MetricRow
                label="Success Rate"
                value={`${Math.round(agent.metrics?.successRate || 0)}%`}
              />
              <MetricRow
                label="Actions"
                value={agent.metrics?.totalActionsTaken || 0}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.archived}`}>
      {status}
    </span>
  );
}

function MetricItem({
  label,
  value,
  subtext
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div>
      <p className="text-gray-600 text-xs">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
