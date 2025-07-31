import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppStore, ThemeMode, AppSettings, OpenAIConfig, GoogleTTSConfig, N8nConfig, SupabaseConfig, ChatConversation, VoiceSettings, N8nExecution, ApiUsageStats, SystemMetrics } from '../types';

const defaultSettings: AppSettings = {
  theme: 'dark',
  language: 'th',
  fontSize: 'medium',
  notifications: true,
  autoSave: true,
};

const defaultVoiceSettings: VoiceSettings = {
  isRecording: false,
  mode: 'push-to-talk',
  volume: 0.8,
  sensitivity: 0.5,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings: Partial<AppSettings>) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // API Configurations
      openaiConfig: null,
      googleTTSConfig: null,
      n8nConfig: null,
      supabaseConfig: null,

      setOpenAIConfig: (config: OpenAIConfig) => set({ openaiConfig: config }),
      setGoogleTTSConfig: (config: GoogleTTSConfig) => set({ googleTTSConfig: config }),
      setN8nConfig: (config: N8nConfig) => set({ n8nConfig: config }),
      setSupabaseConfig: (config: SupabaseConfig) => set({ supabaseConfig: config }),

      // Chat
      conversations: [],
      activeConversationId: null,
      addConversation: (conversation: ChatConversation) =>
        set((state) => ({
          conversations: [...state.conversations, conversation],
        })),
      updateConversation: (id: string, updatedConversation: Partial<ChatConversation>) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updatedConversation } : conv
          ),
        })),
      deleteConversation: (id: string) =>
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        })),
      setActiveConversation: (id: string | null) => set({ activeConversationId: id }),

      // Voice
      voiceSettings: defaultVoiceSettings,
      updateVoiceSettings: (newSettings: Partial<VoiceSettings>) =>
        set((state) => ({
          voiceSettings: { ...state.voiceSettings, ...newSettings },
        })),

      // Monitoring
      n8nExecutions: [],
      apiUsage: null,
      systemMetrics: null,

      addN8nExecution: (execution: N8nExecution) =>
        set((state) => ({
          n8nExecutions: [execution, ...state.n8nExecutions].slice(0, 100), // Keep only last 100
        })),
      updateApiUsage: (usage: ApiUsageStats) => set({ apiUsage: usage }),
      updateSystemMetrics: (metrics: SystemMetrics) => set({ systemMetrics: metrics }),
    }),
    {
      name: 'yuri-voice-ai-store',
      partialize: (state) => ({
        theme: state.theme,
        settings: state.settings,
        openaiConfig: state.openaiConfig,
        googleTTSConfig: state.googleTTSConfig,
        n8nConfig: state.n8nConfig,
        supabaseConfig: state.supabaseConfig,
        conversations: state.conversations,
        voiceSettings: state.voiceSettings,
      }),
    }
  )
);

// Initialize theme on app start
const initializeTheme = () => {
  const { theme } = useAppStore.getState();
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Call this when the app starts
if (typeof window !== 'undefined') {
  initializeTheme();
}