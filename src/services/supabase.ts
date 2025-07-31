import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig, ChatConversation, TokenUsage } from '../types';

class SupabaseService {
  private client: SupabaseClient | null = null;

  initialize(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey);
  }

  // Chat operations
  async saveConversation(conversation: ChatConversation): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('conversations')
        .upsert({
          id: conversation.id,
          title: conversation.title,
          messages: conversation.messages,
          created_at: conversation.createdAt.toISOString(),
          updated_at: conversation.updatedAt.toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw new Error('Failed to save conversation');
    }
  }

  async getConversations(): Promise<ChatConversation[]> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        messages: conv.messages || [],
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async deleteConversation(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  // Token usage tracking
  async saveTokenUsage(usage: TokenUsage): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('token_usage')
        .insert({
          service: usage.service,
          tokens: usage.tokens,
          cost: usage.cost,
          timestamp: usage.timestamp.toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving token usage:', error);
      throw new Error('Failed to save token usage');
    }
  }

  async getTokenUsage(service?: string, days = 30): Promise<TokenUsage[]> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      let query = this.client
        .from('token_usage')
        .select('*')
        .gte('timestamp', fromDate.toISOString())
        .order('timestamp', { ascending: false });

      if (service) {
        query = query.eq('service', service);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((usage: any) => ({
        service: usage.service,
        tokens: usage.tokens,
        cost: usage.cost,
        timestamp: new Date(usage.timestamp),
      }));
    } catch (error) {
      console.error('Error fetching token usage:', error);
      return [];
    }
  }

  // Settings operations
  async saveSettings(userId: string, settings: any): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.client
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  async getSettings(userId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      
      return data?.settings || {};
    } catch (error) {
      console.error('Error fetching settings:', error);
      return {};
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const { error } = await this.client
        .from('conversations')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  // Real-time subscriptions
  subscribeToConversations(callback: (payload: any) => void) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    return this.client
      .channel('conversations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' }, 
        callback
      )
      .subscribe();
  }

  subscribeToTokenUsage(callback: (payload: any) => void) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    return this.client
      .channel('token_usage')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'token_usage' }, 
        callback
      )
      .subscribe();
  }

  // Cleanup
  async clearAllData(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      await Promise.all([
        this.client.from('conversations').delete().neq('id', ''),
        this.client.from('token_usage').delete().neq('service', ''),
        this.client.from('user_settings').delete().neq('user_id', ''),
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }
}

export const supabaseService = new SupabaseService();