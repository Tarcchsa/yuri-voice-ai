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
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-b border-primary-200/50 dark:border-gray-700 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Monitoring Dashboard
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
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
              className="w-40 bg-white/80 dark:bg-gray-700/80 border-primary-200/50"
            />
            
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center border-primary-200/50 hover:border-primary-300 hover:bg-primary-50 dark:border-gray-600"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Connection Status */}
        <Card className="bg-gradient-to-r from-white to-primary-50/30 dark:from-gray-800 dark:to-gray-900 border-primary-200/50 dark:border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Activity className="w-6 h-6 mr-3 text-primary-600" />
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
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:shadow-md transition-all duration-200"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {service.name}
                  </span>
                  <div className="flex items-center">
                    {service.config ? (
                      service.status ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <XCircle className="w-5 h-5 text-red-500 mr-1" />
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">Error</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-amber-500 mr-1" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not Setup</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-white to-purple-50/30 dark:from-gray-800 dark:to-gray-900 border-primary-200/50 dark:border-gray-600">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => executeQuickAction('test')}
                disabled={!connectionStatus.n8n}
                className="flex items-center justify-center p-6 h-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500"
              >
                <CheckCircle className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Test Automation</div>
                  <div className="text-xs opacity-90">Run system test</div>
                </div>
              </Button>
              
              <Button
                onClick={() => executeQuickAction('book_room')}
                disabled={!connectionStatus.n8n}
                className="flex items-center justify-center p-6 h-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500"
              >
                <Calendar className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Book Room</div>
                  <div className="text-xs opacity-90">Reserve meeting room</div>
                </div>
              </Button>
              
              <Button
                onClick={() => executeQuickAction('schedule_meeting')}
                disabled={!connectionStatus.n8n}
                className="flex items-center justify-center p-6 h-auto bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500"
              >
                <Clock className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Schedule Meeting</div>
                  <div className="text-xs opacity-90">Create calendar event</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Total Executions
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {executionStats.total}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    This week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                    Successful
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {executionStats.successful}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">
                    {executionStats.total > 0 ? Math.round((executionStats.successful / executionStats.total) * 100) : 0}% success rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200/50 dark:border-red-700/50 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                  <XCircle className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                    Failed
                  </p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                    {executionStats.failed}
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">
                    Need attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/50 dark:border-purple-700/50 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                    Total Cost
                  </p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    $134.25
                  </p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                    This month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Chart */}
          <Card className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-gray-900 border-blue-200/50 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                API Usage Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="openai" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      name="OpenAI Tokens" 
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="googleTTS" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      name="Google TTS Chars" 
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Execution Status */}
          <Card className="bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-gray-900 border-purple-200/50 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
                Execution Status Distribution
              </CardTitle>
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="flex justify-center space-x-4 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Executions */}
        <Card className="bg-gradient-to-r from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-900 border-gray-200/50 dark:border-gray-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-600" />
                Recent Executions
              </CardTitle>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'success', label: 'Successful' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'running', label: 'Running' },
                ]}
                className="w-32 bg-white/80 dark:bg-gray-700/80 border-gray-200/50"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Workflow
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Start Time
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center">
                          <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                          <p>No executions found</p>
                          <p className="text-xs">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExecutions.map((execution) => (
                      <tr key={execution.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                        <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                          {execution.workflowName}
                        </td>
                        <td className="py-4 px-4">
                          <span className={cn(
                            'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                            execution.status === 'success' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                            execution.status === 'failed' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                            execution.status === 'running' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          )}>
                            {execution.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {execution.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                            {execution.status === 'running' && <Clock className="w-3 h-3 mr-1" />}
                            {execution.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                          {execution.startTime.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                          {execution.executionTime ? `${execution.executionTime}ms` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};