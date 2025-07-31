import OpenAI from 'openai';
import type { OpenAIConfig, ChatMessage } from '../types';

class OpenAIService {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;

  initialize(config: OpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a proxy server
    });
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return response.choices[0]?.message?.content || 'No response received';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get response from OpenAI');
    }
  }

  async *streamMessage(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error('Failed to stream response from OpenAI');
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  getUsage(): { tokensUsed: number; estimatedCost: number } {
    // This would typically be tracked through API responses
    // For now, return mock data
    return {
      tokensUsed: 0,
      estimatedCost: 0,
    };
  }
}

export const openaiService = new OpenAIService();