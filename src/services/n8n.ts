import type { N8nConfig, N8nExecution } from '../types';

class N8nService {
  private config: N8nConfig | null = null;

  initialize(config: N8nConfig) {
    this.config = config;
  }

  async sendCommand(command: string, data?: any): Promise<any> {
    if (!this.config) {
      throw new Error('n8n service not initialized');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          command,
          data,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`n8n webhook responded with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('n8n webhook error:', error);
      throw new Error('Failed to send command to n8n');
    }
  }

  async executeWorkflow(workflowId: string, data?: any): Promise<string> {
    if (!this.config?.baseUrl) {
      throw new Error('n8n base URL not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`n8n execution failed: ${response.status}`);
      }

      const result = await response.json();
      return result.executionId;
    } catch (error) {
      console.error('n8n workflow execution error:', error);
      throw new Error('Failed to execute n8n workflow');
    }
  }

  async getExecutionStatus(executionId: string): Promise<N8nExecution> {
    if (!this.config?.baseUrl) {
      throw new Error('n8n base URL not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get execution status: ${response.status}`);
      }

      const execution = await response.json();
      
      return {
        id: execution.id,
        status: execution.finished ? 'success' : execution.stoppedAt ? 'failed' : 'running',
        startTime: new Date(execution.startedAt),
        endTime: execution.stoppedAt ? new Date(execution.stoppedAt) : undefined,
        workflowName: execution.workflowData?.name || 'Unknown',
        executionTime: execution.stoppedAt 
          ? new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()
          : undefined,
      };
    } catch (error) {
      console.error('n8n execution status error:', error);
      throw new Error('Failed to get execution status');
    }
  }

  async getExecutions(limit = 50): Promise<N8nExecution[]> {
    if (!this.config?.baseUrl) {
      throw new Error('n8n base URL not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/executions?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get executions: ${response.status}`);
      }

      const data = await response.json();
      
      return data.data.map((execution: any) => ({
        id: execution.id,
        status: execution.finished ? 'success' : execution.stoppedAt ? 'failed' : 'running',
        startTime: new Date(execution.startedAt),
        endTime: execution.stoppedAt ? new Date(execution.stoppedAt) : undefined,
        workflowName: execution.workflowData?.name || 'Unknown',
        executionTime: execution.stoppedAt 
          ? new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()
          : undefined,
      }));
    } catch (error) {
      console.error('n8n executions fetch error:', error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      // Test webhook endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 404; // 404 is fine for webhook test
    } catch (error) {
      console.error('n8n connection test failed:', error);
      return false;
    }
  }

  // Quick action methods
  async bookRoom(roomName: string, date: string, time: string): Promise<any> {
    return this.sendCommand('book_room', { roomName, date, time });
  }

  async scheduleMeeting(title: string, attendees: string[], date: string, time: string): Promise<any> {
    return this.sendCommand('schedule_meeting', { title, attendees, date, time });
  }

  async testAutomation(): Promise<any> {
    return this.sendCommand('test_automation', { timestamp: new Date().toISOString() });
  }
}

export const n8nService = new N8nService();