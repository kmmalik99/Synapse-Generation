import React, { useEffect, useRef, useState } from 'react';
import { enhancePromptStream } from '../services/geminiService';
import { Message } from '../types';
import { useError } from '../hooks/useError';
import { SparklesIcon, UserIcon, ArrowRightIcon, TrashIcon } from './icons';

interface PromptEnhancerProps {
  onEnhanceComplete: (enhancedPrompt: string) => void;
  state: { messages: Message[], prompt: string };
  setState: React.Dispatch<React.SetStateAction<PromptEnhancerProps['state']>>;
  onReset: () => void;
}

const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;

const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ onEnhanceComplete, state, setState, onReset }) => {
  const { messages, prompt } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const examplePrompt = `build a mobile app in single html named "AI TEXT & Images" like the search topic as Chatgpt and other images searching and making on different aspect ratio and formats including 2k and 4k with the help of chatgpt api key and other relating ai tools, apps and website. the app could be build on a professional way with the premium theme.`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isLoading && messages.length > 0) {
        (window as any).Prism?.highlightAll();
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!prompt.trim()) {
      showError('Please enter a prompt to enhance.');
      return;
    }
    setIsLoading(true);

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    const modelMessageId = `model-${Date.now()}`;
    setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, { id: modelMessageId, role: 'model', text: '' }],
        prompt: ''
    }));
    
    try {
      let fullResult = '';
      for await (const chunk of enhancePromptStream(prompt)) {
          fullResult += chunk;
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === modelMessageId ? { ...msg, text: fullResult } : msg
            )
          }));
      }
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        showError(`Failed to enhance prompt: ${error.message}`);
        console.error(error);
        setState(prev => ({ ...prev, messages: prev.messages.filter(msg => msg.id !== modelMessageId)}));
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
  
  const handleUsePrompt = (promptToUse: string) => {
    onEnhanceComplete(promptToUse);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200/75 flex justify-end items-center">
            <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                <TrashIcon className="h-4 w-4" />
                Clear
            </button>
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.length === 0 && (
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="max-w-xl rounded-lg bg-white text-slate-800 p-3 border border-slate-200">
                        <p className="text-sm">Hello! I'm Synapse. I specialize in refining rough ideas. Give me a concept, and I'll forge it into a powerful, precise prompt for any AI.</p>
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
                    <div className={`max-w-xl rounded-lg ${message.role === 'user' ? 'bg-emerald-600 text-white p-3' : 'bg-white text-slate-800 p-0 border border-slate-200'}`}>
                        <div className="text-sm whitespace-pre-wrap">
                            <pre className="whitespace-pre-wrap !bg-transparent !p-0 w-full h-full"><code className={`language-markdown font-mono ${message.role === 'user' ? '!text-white' : '!text-slate-800'}`}>{message.text}{isLoading && index === messages.length - 1 && <BlinkingCursor />}</code></pre>
                        </div>
                        {message.role === 'model' && !isLoading && message.text && (
                            <div className="px-3 pb-3 mt-2 border-t border-slate-200/75 pt-3 flex justify-end">
                                <button
                                    onClick={() => handleUsePrompt(message.text)}
                                    className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center gap-2 text-sm"
                                >
                                    <span>Use as Script Prompt</span>
                                    <ArrowRightIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                     {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
             <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={() => setState(prev => ({...prev, prompt: examplePrompt}))}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-md"
                >
                    Try an Example
                </button>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
                onKeyDown={handleKeyDown}
                placeholder="Describe your idea or goal..."
                className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
                disabled={isLoading}
                rows={3}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !prompt.trim()}
                className="bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                aria-label="Enhance prompt"
              >
                <SparklesIcon className="h-5 h-5" />
              </button>
            </div>
        </div>
    </div>
  );
};

export default PromptEnhancer;