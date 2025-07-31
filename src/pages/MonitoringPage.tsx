import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '../stores/appStore';
import { Button } from '../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Select } from '../components/common/Input';
import { n8nService } from '../services/n8n';
import { supabaseService } from '../services/supabase';
import { cn } from '../utils/cn';
import type { N8nExecution } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const MonitoringPage: React.FC = () => {
  const {
    n8nConfig,
    openaiConfig,
    googleTTSConfig,
    supabaseConfig,
    addN8nExecution,
  } = useAppStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState({
    n8n: false,
    openai: false,
    googleTTS: false,
    supabase: false,
  });

  // Mock data for demonstration
  const [mockUsageData] = useState([
    { date: '2024-01-25', openai: 1200, googleTTS: 800, cost: 15.20 },
    { date: '2024-01-26', openai: 1500, googleTTS: 950, cost: 18.75 },
    { date: '2024-01-27', openai: 900, googleTTS: 600, cost: 12.30 },
    { date: '2024-01-28', openai: 1800, googleTTS: 1100, cost: 22.50 },
    { date: '2024-01-29', openai: 1350, googleTTS: 750, cost: 16.85 },
    { date: '2024-01-30', openai: 2100, googleTTS: 1300, cost: 28.40 },
    { date: '2024-01-31', openai: 1650, googleTTS: 900, cost: 20.25 },
  ]);

  const [mockExecutions] = useState<N8nExecution[]>([
    {
      id: 'exec_1',
      status: 'success',
      startTime: new Date('2024-01-31T10:30:00'),
      endTime: new Date('2024-01-31T10:30:15'),
      workflowName: 'Book Meeting Room',
      executionTime: 15000,
    },
    {
      id: 'exec_2',
      status: 'success',
      startTime: new Date('2024-01-31T09:15:00'),
      endTime: new Date('2024-01-31T09:15:08'),
      workflowName: 'Schedule Meeting',
      executionTime: 8000,
    },
    {
      id: 'exec_3',
      status: 'failed',
      startTime: new Date('2024-01-31T08:45:00'),
      endTime: new Date('2024-01-31T08:45:30'),
      workflowName: 'Send Notification',
      executionTime: 30000,
    },
  ]);

  useEffect(() => {
    checkConnectionStatus();
    refreshData();
  }, []);

  const checkConnectionStatus = async () => {
    const status = {
      n8n: false,
      openai: false,
      googleTTS: false,
      supabase: false,
    };

    try {
      if (n8nConfig) {
        n8nService.initialize(n8nConfig);
        status.n8n = await n8nService.testConnection();
      }
    } catch (error) {
      console.error('n8n connection test failed:', error);
    }

    try {
      if (openaiConfig) {
        // OpenAI connection would be tested here
        status.openai = true; // Mock for demo
      }
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
    }

    try {
      if (googleTTSConfig) {
        // Google TTS connection would be tested here
        status.googleTTS = true; // Mock for demo
      }
    } catch (error) {
      console.error('Google TTS connection test failed:', error);
    }

    try {
      if (supabaseConfig) {
        supabaseService.initialize(supabaseConfig);
        status.supabase = await supabaseService.testConnection();
      }
    } catch (error) {
      console.error('Supabase connection test failed:', error);
    }

    setConnectionStatus(status);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh n8n executions
      if (n8nConfig) {
        const executions = await n8nService.getExecutions();
        executions.forEach(exec => addN8nExecution(exec));
      }

      // Refresh API usage data
      if (supabaseConfig) {
        await supabaseService.getTokenUsage();
        // Process usage data and update store
        // This would be more complex in a real implementation
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const executeQuickAction = async (action: string) => {
    if (!n8nConfig) {
      alert('Please configure n8n integration first');
      return;
    }

    try {
      let result;
      switch (action) {
        case 'test':
          result = await n8nService.testAutomation();
          break;
        case 'book_room':
          result = await n8nService.bookRoom('Conference Room A', new Date().toISOString().split('T')[0], '14:00');
          break;
        case 'schedule_meeting':
          result = await n8nService.scheduleMeeting('Team Standup', ['team@example.com'], new Date().toISOString().split('T')[0], '09:00');
          break;
      }
      
      if (result) {
        const execution: N8nExecution = {
          id: `exec_${Date.now()}`,
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          workflowName: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          executionTime: 1000,
        };
        addN8nExecution(execution);
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      const execution: N8nExecution = {
        id: `exec_${Date.now()}`,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        workflowName: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        executionTime: 5000,
      };
      addN8nExecution(execution);
    }
  };

  const filteredExecutions = mockExecutions.filter(exec => 
    statusFilter === 'all' || exec.status === statusFilter
  );

  const executionStats = {
    total: mockExecutions.length,
    successful: mockExecutions.filter(e => e.status === 'success').length,
    failed: mockExecutions.filter(e => e.status === 'failed').length,
    running: mockExecutions.filter(e => e.status === 'running').length,
  };

  const pieData = [
    { name: 'Successful', value: executionStats.successful, color: COLORS[1] },
    { name: 'Failed', value: executionStats.failed, color: COLORS[3] },
    { name: 'Running', value: executionStats.running, color: COLORS[2] },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Monitoring Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track your AI automations and API usage
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: '24h', label: 'Last 24 hours' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
              ]}
              className="w-40"
            />
            
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'n8n', status: connectionStatus.n8n, config: n8nConfig },
                { name: 'OpenAI', status: connectionStatus.openai, config: openaiConfig },
                { name: 'Google TTS', status: connectionStatus.googleTTS, config: googleTTSConfig },
                { name: 'Supabase', status: connectionStatus.supabase, config: supabaseConfig },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.name}
                  </span>
                  <div className="flex items-center">
                    {service.config ? (
                      service.status ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => executeQuickAction('test')}
                disabled={!connectionStatus.n8n}
                className="flex items-center justify-center p-4 h-auto"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Test Automation
              </Button>
              
              <Button
                onClick={() => executeQuickAction('book_room')}
                disabled={!connectionStatus.n8n}
                className="flex items-center justify-center p-4 h-auto"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Room
              </Button>
              
              <Button
                onClick={() => executeQuickAction('schedule_meeting')}
                disabled={!connectionStatus.n8n}
                className="flex items-center justify-center p-4 h-auto"
              >
                <Clock className="w-5 h-5 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Executions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {executionStats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Successful
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {executionStats.successful}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Failed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {executionStats.failed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Cost
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    $134.25
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="openai" stroke="#3B82F6" name="OpenAI Tokens" />
                    <Line type="monotone" dataKey="googleTTS" stroke="#10B981" name="Google TTS Chars" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Execution Status */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Executions</CardTitle>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'success', label: 'Successful' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'running', label: 'Running' },
                ]}
                className="w-32"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-medium text-gray-900 dark:text-white">
                      Workflow
                    </th>
                    <th className="text-left py-2 font-medium text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="text-left py-2 font-medium text-gray-900 dark:text-white">
                      Start Time
                    </th>
                    <th className="text-left py-2 font-medium text-gray-900 dark:text-white">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutions.map((execution) => (
                    <tr key={execution.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 text-gray-900 dark:text-white">
                        {execution.workflowName}
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          execution.status === 'success' && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                          execution.status === 'failed' && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                          execution.status === 'running' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        )}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {execution.startTime.toLocaleString()}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {execution.executionTime ? `${execution.executionTime}ms` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};