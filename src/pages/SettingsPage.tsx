import React, { useState } from 'react';
import {
  Key,
  Palette,
  Database,
  TestTube,
  Download,
  Upload,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { openaiService } from '../services/openai';
import { googleTTSService } from '../services/googleTTS';
import { n8nService } from '../services/n8n';
import { supabaseService } from '../services/supabase';
import { cn } from '../utils/cn';
import type { OpenAIConfig, GoogleTTSConfig, N8nConfig, SupabaseConfig } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    openaiConfig,
    googleTTSConfig,
    n8nConfig,
    supabaseConfig,
    setOpenAIConfig,
    setGoogleTTSConfig,
    setN8nConfig,
    setSupabaseConfig,
    conversations,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('api');
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [isTestingConnections, setIsTestingConnections] = useState(false);

  // Form states
  const [openaiForm, setOpenaiForm] = useState<OpenAIConfig>(
    openaiConfig || {
      apiKey: '',
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
    }
  );

  const [googleTTSForm, setGoogleTTSForm] = useState<GoogleTTSConfig>(
    googleTTSConfig || {
      apiKey: '',
      voice: 'th-TH-Standard-A',
      rate: 1.0,
      pitch: 0.0,
      languageCode: 'th-TH',
    }
  );

  const [n8nForm, setN8nForm] = useState<N8nConfig>(
    n8nConfig || {
      webhookUrl: '',
      apiKey: '',
      baseUrl: '',
      timeout: 30000,
    }
  );

  const [supabaseForm, setSupabaseForm] = useState<SupabaseConfig>(
    supabaseConfig || {
      url: '',
      anonKey: '',
      serviceKey: '',
    }
  );

  const tabs = [
    { id: 'api', name: 'API Configuration', icon: Key },
    { id: 'preferences', name: 'App Preferences', icon: Palette },
    { id: 'data', name: 'Data Management', icon: Database },
    { id: 'testing', name: 'Connection Testing', icon: TestTube },
  ];

  const saveAPIConfiguration = async () => {
    setIsSaving(true);
    try {
      // Validate and save configurations
      if (openaiForm.apiKey) {
        setOpenAIConfig(openaiForm);
        openaiService.initialize(openaiForm);
      }

      if (googleTTSForm.apiKey) {
        setGoogleTTSConfig(googleTTSForm);
        googleTTSService.initialize(googleTTSForm);
      }

      if (n8nForm.webhookUrl) {
        setN8nConfig(n8nForm);
        n8nService.initialize(n8nForm);
      }

      if (supabaseForm.url && supabaseForm.anonKey) {
        setSupabaseConfig(supabaseForm);
        supabaseService.initialize(supabaseForm);
      }

      // Show success message
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please check your inputs.');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (service: string) => {
    setIsTestingConnections(true);
    try {
      let result = false;

      switch (service) {
        case 'openai':
          if (openaiForm.apiKey) {
            openaiService.initialize(openaiForm);
            result = await openaiService.testConnection();
          }
          break;
        case 'googleTTS':
          if (googleTTSForm.apiKey) {
            googleTTSService.initialize(googleTTSForm);
            result = await googleTTSService.testConnection();
          }
          break;
        case 'n8n':
          if (n8nForm.webhookUrl) {
            n8nService.initialize(n8nForm);
            result = await n8nService.testConnection();
          }
          break;
        case 'supabase':
          if (supabaseForm.url && supabaseForm.anonKey) {
            supabaseService.initialize(supabaseForm);
            result = await supabaseService.testConnection();
          }
          break;
      }

      setTestResults(prev => ({ ...prev, [service]: result }));
    } catch (error) {
      console.error(`Error testing ${service}:`, error);
      setTestResults(prev => ({ ...prev, [service]: false }));
    } finally {
      setIsTestingConnections(false);
    }
  };

  const testAllConnections = async () => {
    await Promise.all([
      testConnection('openai'),
      testConnection('googleTTS'),
      testConnection('n8n'),
      testConnection('supabase'),
    ]);
  };

  const exportData = () => {
    const data = {
      conversations,
      settings,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yuri-voice-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate data structure
        if (data.conversations && data.settings) {
          // Import conversations
          data.conversations.forEach((conv: any) => {
            // This would need to be implemented with proper validation
            console.log('Would import conversation:', conv.title);
          });

          // Import settings
          updateSettings(data.settings);
          
          alert('Data imported successfully!');
        } else {
          alert('Invalid backup file format');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear conversations and reset settings
      localStorage.clear();
      location.reload();
    }
  };

  const renderAPIConfiguration = () => (
    <div className="space-y-6">
      {/* OpenAI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="API Key"
            type="password"
            value={openaiForm.apiKey}
            onChange={(e) => setOpenaiForm(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="sk-..."
            helperText="Your OpenAI API key for GPT-4 access"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Model"
              value={openaiForm.model}
              onChange={(e) => setOpenaiForm(prev => ({ ...prev, model: e.target.value }))}
              options={[
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
              ]}
            />
            
            <Input
              label="Max Tokens"
              type="number"
              value={openaiForm.maxTokens}
              onChange={(e) => setOpenaiForm(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
              min="100"
              max="4000"
            />
            
            <Input
              label="Temperature"
              type="number"
              value={openaiForm.temperature}
              onChange={(e) => setOpenaiForm(prev => ({ ...prev, temperature: Number(e.target.value) }))}
              min="0"
              max="2"
              step="0.1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Google TTS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Google Cloud Text-to-Speech</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="API Key"
            type="password"
            value={googleTTSForm.apiKey}
            onChange={(e) => setGoogleTTSForm(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="Google Cloud API Key"
            helperText="Your Google Cloud TTS API key"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Voice"
              value={googleTTSForm.voice}
              onChange={(e) => setGoogleTTSForm(prev => ({ ...prev, voice: e.target.value }))}
              options={[
                { value: 'th-TH-Standard-A', label: 'Thai Female (A)' },
                { value: 'th-TH-Standard-B', label: 'Thai Male (B)' },
                { value: 'en-US-Standard-A', label: 'English Female (A)' },
                { value: 'en-US-Standard-B', label: 'English Male (B)' },
              ]}
            />
            
            <Input
              label="Rate"
              type="number"
              value={googleTTSForm.rate}
              onChange={(e) => setGoogleTTSForm(prev => ({ ...prev, rate: Number(e.target.value) }))}
              min="0.25"
              max="4.0"
              step="0.1"
            />
            
            <Input
              label="Pitch"
              type="number"
              value={googleTTSForm.pitch}
              onChange={(e) => setGoogleTTSForm(prev => ({ ...prev, pitch: Number(e.target.value) }))}
              min="-20"
              max="20"
              step="0.1"
            />
            
            <Select
              label="Language"
              value={googleTTSForm.languageCode}
              onChange={(e) => setGoogleTTSForm(prev => ({ ...prev, languageCode: e.target.value }))}
              options={[
                { value: 'th-TH', label: 'Thai' },
                { value: 'en-US', label: 'English (US)' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* n8n Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>n8n Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Webhook URL"
            value={n8nForm.webhookUrl}
            onChange={(e) => setN8nForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
            placeholder="https://your-n8n-instance.com/webhook/..."
            helperText="Your n8n webhook URL for automation triggers"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="API Key"
              type="password"
              value={n8nForm.apiKey}
              onChange={(e) => setN8nForm(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Optional API key"
            />
            
            <Input
              label="Base URL"
              value={n8nForm.baseUrl}
              onChange={(e) => setN8nForm(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://your-n8n-instance.com"
            />
            
            <Input
              label="Timeout (ms)"
              type="number"
              value={n8nForm.timeout}
              onChange={(e) => setN8nForm(prev => ({ ...prev, timeout: Number(e.target.value) }))}
              min="5000"
              max="60000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Supabase Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Project URL"
            value={supabaseForm.url}
            onChange={(e) => setSupabaseForm(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://your-project.supabase.co"
            helperText="Your Supabase project URL"
          />
          
          <Input
            label="Anonymous Key"
            type="password"
            value={supabaseForm.anonKey}
            onChange={(e) => setSupabaseForm(prev => ({ ...prev, anonKey: e.target.value }))}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            helperText="Your Supabase anonymous/public key"
          />
          
          <Input
            label="Service Key (Optional)"
            type="password"
            value={supabaseForm.serviceKey || ''}
            onChange={(e) => setSupabaseForm(prev => ({ ...prev, serviceKey: e.target.value }))}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            helperText="Service role key for admin operations"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAPIConfiguration} disabled={isSaving} isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          
          <Select
            label="Font Size"
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: e.target.value as 'small' | 'medium' | 'large' })}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language & Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Language"
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value as 'th' | 'en' })}
            options={[
              { value: 'th', label: 'Thai (ไทย)' },
              { value: 'en', label: 'English' },
            ]}
          />
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => updateSettings({ notifications: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable notifications
              </span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-save conversations
              </span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDataManagement = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={exportData} className="flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Export your conversations and settings as a JSON file for backup or transfer to another device.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Clear all application data including conversations, settings, and API configurations.
              This action cannot be undone.
            </p>
            
            <Button variant="danger" onClick={clearAllData} className="flex items-center">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConnectionTesting = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connection Testing</CardTitle>
            <Button onClick={testAllConnections} disabled={isTestingConnections}>
              Test All Connections
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { service: 'openai', name: 'OpenAI', config: openaiConfig },
              { service: 'googleTTS', name: 'Google TTS', config: googleTTSConfig },
              { service: 'n8n', name: 'n8n', config: n8nConfig },
              { service: 'supabase', name: 'Supabase', config: supabaseConfig },
            ].map(({ service, name, config }) => (
              <div
                key={service}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {testResults[service] === true && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {testResults[service] === false && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    {testResults[service] === null && (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {config ? 'Configured' : 'Not configured'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(service)}
                  disabled={!config || isTestingConnections}
                >
                  Test Connection
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your AI assistant and integrations
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                )}
              >
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'api' && renderAPIConfiguration()}
          {activeTab === 'preferences' && renderPreferences()}
          {activeTab === 'data' && renderDataManagement()}
          {activeTab === 'testing' && renderConnectionTesting()}
        </div>
      </div>
    </div>
  );
};