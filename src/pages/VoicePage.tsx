import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Settings2, RotateCcw, Activity } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { Button } from '../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { googleTTSService } from '../services/googleTTS';
import { n8nService } from '../services/n8n';
import { cn } from '../utils/cn';

export const VoicePage: React.FC = () => {
  const { voiceSettings, updateVoiceSettings, googleTTSConfig, n8nConfig } = useAppStore();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'th-TH';

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscript(finalTranscript);
            handleVoiceCommand(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    setError(null);
    setTranscript('');
    setResponse('');
    setIsListening(true);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      setError('Failed to start speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Send command to n8n if configured
      if (n8nConfig) {
        n8nService.initialize(n8nConfig);
        const n8nResponse = await n8nService.sendCommand(command);
        setResponse(`Command sent to n8n: ${JSON.stringify(n8nResponse)}`);
      } else {
        setResponse(`Voice command received: "${command}". Configure n8n integration in settings to process commands.`);
      }

      // Convert response to speech if TTS is configured
      if (googleTTSConfig && response) {
        googleTTSService.initialize(googleTTSConfig);
        await googleTTSService.synthesizeText(response);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      setError('Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModeToggle = () => {
    const newMode = voiceSettings.mode === 'push-to-talk' ? 'voice-activation' : 'push-to-talk';
    updateVoiceSettings({ mode: newMode });
  };

  const handleClear = () => {
    setTranscript('');
    setResponse('');
    setError(null);
    if (isListening) {
      stopListening();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-b border-primary-200 dark:border-gray-700 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Voice Generation
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
              Thai Voice Assistant with n8n Integration
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleModeToggle}
              className="flex items-center border-primary-200 hover:border-primary-300 hover:bg-primary-50 dark:border-gray-600"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              {voiceSettings.mode === 'push-to-talk' ? 'Push to Talk' : 'Voice Activation'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex items-center hover:bg-primary-50 dark:hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl w-full">
          {/* Voice Control Circle */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <button
                className={cn(
                  'w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95',
                  'shadow-2xl border-4 border-white/20 backdrop-blur-sm',
                  isListening
                    ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 hover:from-red-500 hover:via-red-600 hover:to-red-700 animate-pulse shadow-red-500/50'
                    : isProcessing
                    ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 cursor-not-allowed shadow-yellow-500/50'
                    : 'bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 hover:from-primary-500 hover:via-primary-600 hover:to-primary-700 shadow-primary-500/50',
                  voiceSettings.mode === 'voice-activation' && !isListening && 'ring-4 ring-primary-200 dark:ring-primary-800 ring-opacity-75'
                )}
                onClick={voiceSettings.mode === 'push-to-talk' ? (isListening ? stopListening : startListening) : undefined}
                onMouseDown={voiceSettings.mode === 'voice-activation' ? startListening : undefined}
                onMouseUp={voiceSettings.mode === 'voice-activation' ? stopListening : undefined}
                onTouchStart={voiceSettings.mode === 'voice-activation' ? startListening : undefined}
                onTouchEnd={voiceSettings.mode === 'voice-activation' ? stopListening : undefined}
                disabled={isProcessing}
              >
                {/* Outer pulse ring for listening state */}
                {isListening && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-600 opacity-30 animate-ping"></div>
                )}
                
                {/* Inner gradient overlay */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/10 to-transparent"></div>
                
                {/* Icon */}
                <div className="relative z-10">
                  {isListening ? (
                    <MicOff className="w-20 h-20 text-white drop-shadow-lg" />
                  ) : isProcessing ? (
                    <Volume2 className="w-20 h-20 text-white drop-shadow-lg animate-bounce" />
                  ) : (
                    <Mic className="w-20 h-20 text-white drop-shadow-lg" />
                  )}
                </div>
              </button>
              
              {/* Status indicator */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <div className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm border border-white/20',
                  isListening
                    ? 'bg-gradient-to-r from-red-500/90 to-red-600/90 text-white'
                    : isProcessing
                    ? 'bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 text-white'
                    : 'bg-gradient-to-r from-gray-700/90 to-gray-800/90 text-white dark:from-gray-600/90 dark:to-gray-700/90'
                )}>
                  {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
                </div>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {voiceSettings.mode === 'push-to-talk' 
                  ? 'Click the button to start/stop recording'
                  : 'Hold the button to speak'
                }
              </p>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Speak in Thai to send commands to your n8n workflows
              </p>
            </div>
          </div>

          {/* Transcript and Response */}
          <div className="space-y-4">
            {transcript && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Voice Input
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 dark:text-white">{transcript}</p>
                </CardContent>
              </Card>
            )}

            {response && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    System Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 dark:text-white">{response}</p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Configuration Status */}
          <div className="mt-8">
            <Card className="bg-gradient-to-r from-gray-50 to-primary-50/20 dark:from-gray-800 dark:to-gray-900 border-primary-200/50 dark:border-gray-600">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-primary-600" />
                  Integration Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Google TTS:</span>
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold',
                      googleTTSConfig 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    )}>
                      {googleTTSConfig ? '✓ Configured' : '⚠ Not configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">n8n Integration:</span>
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold',
                      n8nConfig 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    )}>
                      {n8nConfig ? '✓ Configured' : '⚠ Not configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Speech Recognition:</span>
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold',
                      recognitionRef.current 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    )}>
                      {recognitionRef.current ? '✓ Available' : '⚠ Not supported'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};