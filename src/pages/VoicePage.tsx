import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Settings2, RotateCcw } from 'lucide-react';
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
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Voice Generation
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Thai Voice Assistant with n8n Integration
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleModeToggle}
              className="flex items-center"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              {voiceSettings.mode === 'push-to-talk' ? 'Push to Talk' : 'Voice Activation'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Voice Control Circle */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <button
                className={cn(
                  'w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg',
                  isListening
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse'
                    : isProcessing
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
                  voiceSettings.mode === 'voice-activation' && !isListening && 'ring-4 ring-primary-200 dark:ring-primary-800'
                )}
                onClick={voiceSettings.mode === 'push-to-talk' ? (isListening ? stopListening : startListening) : undefined}
                onMouseDown={voiceSettings.mode === 'voice-activation' ? startListening : undefined}
                onMouseUp={voiceSettings.mode === 'voice-activation' ? stopListening : undefined}
                onTouchStart={voiceSettings.mode === 'voice-activation' ? startListening : undefined}
                onTouchEnd={voiceSettings.mode === 'voice-activation' ? stopListening : undefined}
                disabled={isProcessing}
              >
                {isListening ? (
                  <MicOff className="w-16 h-16 text-white" />
                ) : isProcessing ? (
                  <Volume2 className="w-16 h-16 text-white animate-bounce" />
                ) : (
                  <Mic className="w-16 h-16 text-white" />
                )}
              </button>
              
              {/* Status indicator */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  isListening
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : isProcessing
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                )}>
                  {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {voiceSettings.mode === 'push-to-talk' 
                  ? 'Click to start/stop recording'
                  : 'Hold to speak'
                }
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Integration Status
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Google TTS:</span>
                <span className={cn(
                  'font-medium',
                  googleTTSConfig ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {googleTTSConfig ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">n8n Integration:</span>
                <span className={cn(
                  'font-medium',
                  n8nConfig ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {n8nConfig ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Speech Recognition:</span>
                <span className={cn(
                  'font-medium',
                  recognitionRef.current ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {recognitionRef.current ? 'Available' : 'Not supported'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};