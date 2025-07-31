// Theme types
export type ThemeMode = 'light' | 'dark';

// API Configuration types
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GoogleTTSConfig {
  apiKey: string;
  voice: string;
  rate: number;
  pitch: number;
  languageCode: string;
}

export interface N8nConfig {
  webhookUrl: string;
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  audioUrl?: string;
  isVoiceMessage?: boolean;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Voice types
export interface VoiceSettings {
  isRecording: boolean;
  mode: 'push-to-talk' | 'voice-activation';
  volume: number;
  sensitivity: number;
}

// Monitoring types
export interface N8nExecution {
  id: string;
  status: 'success' | 'failed' | 'running' | 'waiting';
  startTime: Date;
  endTime?: Date;
  workflowName: string;
  executionTime?: number;
}

export interface TokenUsage {
  service: 'openai' | 'google-tts';
  tokens: number;
  cost: number;
  timestamp: Date;
}

export interface ApiUsageStats {
  totalTokens: number;
  totalCost: number;
  dailyUsage: TokenUsage[];
  weeklyUsage: TokenUsage[];
  monthlyUsage: TokenUsage[];
}

// System types
export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  uptime: number;
}

// Settings types
export interface AppSettings {
  theme: ThemeMode;
  language: 'th' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
  autoSave: boolean;
}

// Store types
export interface AppStore {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // API Configurations
  openaiConfig: OpenAIConfig | null;
  googleTTSConfig: GoogleTTSConfig | null;
  n8nConfig: N8nConfig | null;
  supabaseConfig: SupabaseConfig | null;
  
  setOpenAIConfig: (config: OpenAIConfig) => void;
  setGoogleTTSConfig: (config: GoogleTTSConfig) => void;
  setN8nConfig: (config: N8nConfig) => void;
  setSupabaseConfig: (config: SupabaseConfig) => void;
  
  // Chat
  conversations: ChatConversation[];
  activeConversationId: string | null;
  addConversation: (conversation: ChatConversation) => void;
  updateConversation: (id: string, conversation: Partial<ChatConversation>) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  
  // Voice
  voiceSettings: VoiceSettings;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  
  // Monitoring
  n8nExecutions: N8nExecution[];
  apiUsage: ApiUsageStats | null;
  systemMetrics: SystemMetrics | null;
  
  addN8nExecution: (execution: N8nExecution) => void;
  updateApiUsage: (usage: ApiUsageStats) => void;
  updateSystemMetrics: (metrics: SystemMetrics) => void;
}