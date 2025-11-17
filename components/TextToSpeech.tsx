import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, createWavBlob } from '../utils/audio';
import { Message } from '../types';
import { useError } from '../hooks/useError';
import { SpeakerWaveIcon, UserIcon, SparklesIcon, ArrowDownTrayIcon, TrashIcon } from './icons';

interface TextToSpeechProps {
    state: { messages: Message[], prompt: string, voice: string };
    setState: React.Dispatch<React.SetStateAction<TextToSpeechProps['state']>>;
    onReset: () => void;
}

const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;


const TextToSpeech: React.FC<TextToSpeechProps> = ({ state, setState, onReset }) => {
  const { messages, prompt, voice } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    const modelMessageId = `model-${Date.now()}`;
    const currentText = prompt;
    
    setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        prompt: ''
    }));

    // Add a placeholder for the model's response
    setTimeout(() => {
        setState(prev => ({...prev, messages: [...prev.messages, { id: modelMessageId, role: 'model', text: "Generating audio..." }]}));
    }, 100);

    try {
        const base64Audio = await generateSpeech(currentText, voice);
        const decodedBytes = decode(base64Audio);
        const wavBlob = createWavBlob(decodedBytes, { sampleRate: 24000, numChannels: 1 });
        const url = URL.createObjectURL(wavBlob);

        const audioContent = (
            <div className="w-full max-w-md space-y-3">
                <audio src={url} controls className="w-full h-10" />
                <a
                    href={url}
                    download={`ai-speech-${Date.now()}.wav`}
                    className="inline-flex items-center justify-center gap-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md transition-colors font-medium"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download WAV
                </a>
            </div>
        );

        setState(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: '', content: audioContent } : msg
        )}));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(`Failed to generate speech: ${err.message}`);
      setState(prev => ({...prev, messages: prev.messages.filter(m => m.id !== modelMessageId)}));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200/75 flex justify-end items-center">
            <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                <TrashIcon className="h-4 w-4" />
                Clear
            </button>
        </div>
        <div ref={messagesEndRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.length === 0 && (
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="max-w-xl rounded-lg bg-white text-slate-800 p-3 border border-slate-200">
                        <p className="text-sm">Hello, I'm Synapse. Provide any text, and I will lend it a voice. You can select a vocal style below.</p>
                    </div>
                </div>
            )}
            {messages.map((message, index) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className={`max-w-xl rounded-lg ${message.role === 'user' ? 'bg-emerald-600 text-white p-3' : `bg-white text-slate-800 p-3 border border-slate-200 ${message.content ? 'w-full' : ''}`}`}>
                        {message.text && <p className="text-sm">{message.text}</p>}
                        {message.content}
                        {isLoading && index === messages.length - 1 && <BlinkingCursor />}
                    </div>
                     {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>
            ))}
        </div>
        <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
            <div className="flex items-center gap-4 mb-2">
                 <div>
                    <label htmlFor="voice" className="text-sm font-medium text-slate-600 mr-2">Voice:</label>
                    <select 
                        id="voice"
                        value={voice}
                        onChange={(e) => setState(prev => ({...prev, voice: e.target.value}))}
                        className="bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    >
                        {voices.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
                onKeyDown={handleKeyDown}
                placeholder="Enter text to convert to speech..."
                className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
                disabled={isLoading}
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !prompt.trim()}
                className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0 self-stretch"
                aria-label="Generate speech"
              >
                <SpeakerWaveIcon className="h-5 h-5" />
              </button>
            </div>
        </div>
    </div>
  );
};

export default TextToSpeech;