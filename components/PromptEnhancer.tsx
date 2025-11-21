
import React, { useEffect, useRef, useState } from 'react';
import { enhancePromptStream } from '../services/geminiService';
import { Message } from '../types';
import { useError } from '../hooks/useError';
import { SparklesIcon, UserIcon, ArrowRightIcon, TrashIcon, BookmarkIcon, XMarkIcon, ClipboardIcon, CheckIcon } from './icons';

interface PromptEnhancerProps {
  onEnhanceComplete: (enhancedPrompt: string) => void;
  state: { messages: Message[], prompt: string };
  setState: React.Dispatch<React.SetStateAction<PromptEnhancerProps['state']>>;
  onReset: () => void;
  savedPrompts: string[];
  setSavedPrompts: React.Dispatch<React.SetStateAction<string[]>>;
}

const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;

const SavedPromptsPanel: React.FC<{
    isVisible: boolean;
    onClose: () => void;
    prompts: string[];
    onUse: (prompt: string) => void;
    onDelete: (prompt: string) => void;
}> = ({ isVisible, onClose, prompts, onUse, onDelete }) => {
    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

    const handleCopy = (prompt: string) => {
        navigator.clipboard.writeText(prompt);
        setCopiedPrompt(prompt);
        setTimeout(() => setCopiedPrompt(null), 2000);
    };

    return (
        <div 
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-labelledby="saved-prompts-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Panel */}
            <div className={`absolute top-0 right-0 h-full w-full max-w-[85vw] sm:max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
                <header className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-slate-50">
                    <h2 id="saved-prompts-title" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <BookmarkIcon className="h-5 w-5 text-emerald-600" />
                        Saved Prompts
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="flex-grow p-4 overflow-y-auto">
                    {prompts.length === 0 ? (
                        <div className="text-center text-slate-500 h-full flex flex-col justify-center items-center p-4">
                            <BookmarkIcon className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="font-medium">No saved prompts yet</p>
                            <p className="text-sm mt-2">Enhance a prompt and click 'Save' to add it to this collection.</p>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {prompts.map((prompt, index) => (
                                <li key={index} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-sm text-slate-700 line-clamp-4 mb-4 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                        {prompt}
                                    </p>
                                    <div className="flex justify-end items-center gap-2">
                                        <button onClick={() => onUse(prompt)} className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                            <ArrowRightIcon className="h-3.5 w-3.5" />
                                            Use
                                        </button>
                                        <button onClick={() => handleCopy(prompt)} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200">
                                            {copiedPrompt === prompt ? <CheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
                                            {copiedPrompt === prompt ? 'Copied' : 'Copy'}
                                        </button>
                                        <button onClick={() => onDelete(prompt)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};


const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ onEnhanceComplete, state, setState, onReset, savedPrompts, setSavedPrompts }) => {
  const { messages, prompt } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();
  const [isSavedPromptsVisible, setIsSavedPromptsVisible] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

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

  const cleanedPrompt = (p: string) => p.replace(/^```(?:\w+\n)?([\s\S]*)\n```$/, '$1').trim();

  const handleSavePrompt = (promptToSave: string) => {
    const finalPrompt = cleanedPrompt(promptToSave);
    if (!savedPrompts.includes(finalPrompt)) {
        setSavedPrompts(prev => [finalPrompt, ...prev]);
    }
  };
    
  const handleUseSavedPrompt = (prompt: string) => {
      onEnhanceComplete(prompt);
      setIsSavedPromptsVisible(false);
  };

  const handleDeleteSavedPrompt = (promptToDelete: string) => {
      setSavedPrompts(prev => prev.filter(p => p !== promptToDelete));
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
  };


  return (
    <>
    <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200/75 flex justify-between items-center">
            <button onClick={() => setIsSavedPromptsVisible(true)} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors font-medium">
                <BookmarkIcon className="h-4 w-4" />
                Saved Prompts ({savedPrompts.length})
            </button>
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
                            <div className="px-3 pb-3 mt-2 border-t border-slate-200/75 pt-3 flex flex-wrap justify-end gap-2">
                                 <button
                                    onClick={() => handleSavePrompt(message.text)}
                                    disabled={savedPrompts.includes(cleanedPrompt(message.text))}
                                    className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors duration-200 flex items-center gap-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                >
                                    <BookmarkIcon className="h-4 w-4" />
                                    <span>{savedPrompts.includes(cleanedPrompt(message.text)) ? 'Saved' : 'Save'}</span>
                                </button>
                                <button
                                    onClick={() => handleCopy(message.text, message.id)}
                                    className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors duration-200 flex items-center gap-2 text-sm"
                                >
                                    {copiedMessageId === message.id ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <ClipboardIcon className="h-4 w-4" />}
                                    <span>{copiedMessageId === message.id ? 'Copied' : 'Copy'}</span>
                                </button>
                                <button
                                    onClick={() => handleUsePrompt(message.text)}
                                    className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center gap-2 text-sm"
                                >
                                    <span>Use as Script Prompt</span>
                                    <ArrowRightIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {message.role === 'user' && (
                            <div className="flex justify-end mt-2">
                                <button 
                                    onClick={() => handleCopy(message.text, message.id)} 
                                    className="text-emerald-200 hover:text-white hover:bg-emerald-500 p-1 rounded transition-colors"
                                    title="Copy prompt"
                                >
                                    {copiedMessageId === message.id ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
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
    <SavedPromptsPanel 
        isVisible={isSavedPromptsVisible}
        onClose={() => setIsSavedPromptsVisible(false)}
        prompts={savedPrompts}
        onUse={handleUseSavedPrompt}
        onDelete={handleDeleteSavedPrompt}
    />
    </>
  );
};

export default PromptEnhancer;
