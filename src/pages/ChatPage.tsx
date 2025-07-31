import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Plus, 
  Search, 
  MoreVertical,
  Trash2,
  Download,
  MessageCircle 
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
        'flex-shrink-0 border-r border-primary-200/50 dark:border-gray-700 bg-gradient-to-b from-white to-primary-50/30 dark:from-gray-800 dark:to-gray-900 transition-all duration-300 shadow-lg',
        sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-primary-200/50 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Conversations
              </h2>
              <Button size="sm" onClick={createNewConversation} className="rounded-full w-10 h-10 p-0">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 dark:bg-gray-700/80 border-primary-200/50 focus:border-primary-400 rounded-lg"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-primary-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No conversations yet. Start chatting to create your first conversation!
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-primary-50/50 dark:hover:bg-gray-700/50 group transition-all duration-200',
                    activeConversationId === conversation.id && 'bg-gradient-to-r from-primary-100/70 to-purple-100/70 dark:from-primary-900/30 dark:to-purple-900/30 border-primary-200 dark:border-primary-800'
                  )}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {conversation.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
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
                        className="p-1 hover:bg-primary-100 dark:hover:bg-gray-600"
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
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-white via-gray-50/50 to-primary-50/20 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900">
        {/* Chat Header */}
        <div className="flex-shrink-0 p-6 border-b border-primary-200/50 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                {activeConversation?.title || 'AI Chat'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Chat with AI assistant in Thai or English
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden hover:bg-primary-50 dark:hover:bg-gray-700"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
              
              {/* Connection Status */}
              <div className={cn(
                'flex items-center px-3 py-1 rounded-full text-xs font-medium',
                openaiConfig 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  openaiConfig ? 'bg-green-500' : 'bg-amber-500'
                )}>
                </div>
                {openaiConfig ? 'Connected' : 'Not configured'}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-12 h-12 text-primary-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Start a conversation
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Send a message to begin chatting with the AI assistant. You can communicate in both Thai and English.
                </p>
                {!openaiConfig && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
                    ⚠ Please configure OpenAI API in settings to start chatting
                  </p>
                )}
              </div>
            </div>
          ) : (
            activeConversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-sm',
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white ml-12'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 mr-12'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={cn(
                    'text-xs mt-2 opacity-70',
                    msg.role === 'user'
                      ? 'text-primary-100'
                      : 'text-gray-500 dark:text-gray-400'
                  )}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mr-12">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-6 border-t border-primary-200/50 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message in Thai or English..."
                rows={1}
                className="w-full resize-none rounded-xl border border-primary-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            
            <Button
              variant={isRecording ? 'danger' : 'ghost'}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!recognitionRef.current}
              className={cn(
                'p-3 rounded-xl transition-all duration-200',
                isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
                  : 'hover:bg-primary-50 dark:hover:bg-gray-700'
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || isLoading || !openaiConfig}
              className="p-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {!openaiConfig && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 text-center bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
              ⚠ Configure OpenAI API in settings to start chatting
            </p>
          )}
        </div>
      </div>
    </div>
  );
};