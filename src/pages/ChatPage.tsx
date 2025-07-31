import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Plus, 
  Search, 
  MoreVertical,
  Trash2,
  Download 
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { openaiService } from '../services/openai';
import { googleTTSService } from '../services/googleTTS';
import { supabaseService } from '../services/supabase';
import { cn } from '../utils/cn';
import type { ChatMessage, ChatConversation } from '../types';

export const ChatPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    addConversation,
    updateConversation,
    deleteConversation,
    setActiveConversation,
    openaiConfig,
    googleTTSConfig,
    supabaseConfig
  } = useAppStore();

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const activeConversation = conversations.find(conv => conv.id === activeConversationId);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  useEffect(() => {
    // Initialize services
    if (openaiConfig) {
      openaiService.initialize(openaiConfig);
    }
    if (googleTTSConfig) {
      googleTTSService.initialize(googleTTSConfig);
    }
    if (supabaseConfig) {
      supabaseService.initialize(supabaseConfig);
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'th-TH';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setMessage(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, [openaiConfig, googleTTSConfig, supabaseConfig]);

  const createNewConversation = () => {
    const newConversation: ChatConversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    addConversation(newConversation);
    setActiveConversation(newConversation.id);
  };

  const sendMessage = async () => {
    if (!message.trim() || !openaiConfig) return;

    let conversation = activeConversation;
    
    // Create new conversation if none exists
    if (!conversation) {
      conversation = {
        id: `conv_${Date.now()}`,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addConversation(conversation);
      setActiveConversation(conversation.id);
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...conversation.messages, userMessage];
    
    updateConversation(conversation.id, {
      messages: updatedMessages,
      updatedAt: new Date(),
    });

    setMessage('');
    setIsLoading(true);

    try {
      const response = await openaiService.sendMessage(updatedMessages);
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        content: response,
        role: 'assistant',
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      
      updateConversation(conversation.id, {
        messages: finalMessages,
        updatedAt: new Date(),
      });

      // Save to Supabase if configured
      if (supabaseConfig) {
        await supabaseService.saveConversation({
          ...conversation,
          messages: finalMessages,
          updatedAt: new Date(),
        });
      }

      // Text-to-speech if enabled
      if (googleTTSConfig) {
        await googleTTSService.synthesizeText(response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        content: 'Sorry, I encountered an error. Please check your API configuration.',
        role: 'assistant',
        timestamp: new Date(),
      };
      
      updateConversation(conversation.id, {
        messages: [...updatedMessages, errorMessage],
        updatedAt: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startRecording = () => {
    if (!recognitionRef.current) return;
    
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const exportConversation = async (conversation: ChatConversation) => {
    const data = {
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className={cn(
        'flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300',
        sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Conversations
              </h2>
              <Button size="sm" onClick={createNewConversation}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group',
                  activeConversationId === conversation.id && 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                )}
                onClick={() => setActiveConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conversation.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {conversation.messages.length} messages
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportConversation(conversation);
                      }}
                      className="p-1"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeConversation?.title || 'AI Chat'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Chat with AI assistant in Thai or English
              </p>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeConversation?.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg',
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={cn(
                  'text-xs mt-1',
                  msg.role === 'user'
                    ? 'text-primary-100'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message in Thai or English..."
                rows={1}
                className="w-full resize-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>
            
            <Button
              variant={isRecording ? 'danger' : 'ghost'}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!recognitionRef.current}
              className="p-2"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || isLoading || !openaiConfig}
              className="p-2"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {!openaiConfig && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Configure OpenAI API in settings to start chatting
            </p>
          )}
        </div>
      </div>
    </div>
  );
};