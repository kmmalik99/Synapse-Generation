
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { PaperAirplaneIcon, UserIcon, SparklesIcon, AIIcon, TrashIcon, LinkIcon, ClipboardIcon, CheckIcon } from './icons';
import { Message } from '../types';
import { useError } from '../hooks/useError';


interface GroundingSource {
    uri: string;
    title: string;
}

// Extend the Message type from types.ts to include sources locally
interface ChatMessage extends Message {
    sources?: GroundingSource[];
}

interface ChatProps {
    state: {
        messages: ChatMessage[],
        prompt: string,
        useSearch: boolean,
        useMaps: boolean,
        location: { lat: number, lng: number } | null,
    };
    setState: React.Dispatch<React.SetStateAction<ChatProps['state']>>;
    onReset: () => void;
}

const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;

const Chat: React.FC<ChatProps> = ({ state, setState, onReset }) => {
  const { messages, prompt, useSearch, useMaps, location } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key is missing");
        const ai = new GoogleGenAI({ apiKey });
        chatSessionRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are Synapse, a helpful and creative AI assistant. Answer the user's questions clearly and concisely. You can use Markdown for formatting your response.`
            }
        });
    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        showError(`Failed to initialize AI model: ${err.message}`);
        console.error(err);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isLoading && messages.length > 0) {
        (window as any).Prism?.highlightAll();
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (useMaps && !location) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setState(prev => ({ ...prev, location: { lat: position.coords.latitude, lng: position.coords.longitude }}));
            },
            (err) => {
                showError(`Could not get location: ${err.message}. Please enable location permissions.`);
                setState(prev => ({ ...prev, useMaps: false }));
            }
        );
    }
  }, [useMaps, location, setState, showError]);


  const handleSend = async () => {
    if (!prompt.trim() || !chatSessionRef.current) {
      return;
    }
    setIsLoading(true);

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: prompt };
    setState(prev => ({...prev, messages: [...prev.messages, userMessage], prompt: ''}));

    try {
        const tools: any[] = [];
        if (useSearch) tools.push({ googleSearch: {} });
        if (useMaps) tools.push({ googleMaps: {} });

        const toolConfig: any = useMaps && location ? {
            retrievalConfig: {
                latLng: { latitude: location.lat, longitude: location.lng }
            }
        } : undefined;
        
        const stream = await chatSessionRef.current.sendMessageStream({
             message: prompt,
             config: {
                ...(tools.length > 0 && { tools }),
                ...(toolConfig && { toolConfig }),
             }
        });
        
        let modelResponse = '';
        let sources: GroundingSource[] = [];
        const modelMessageId = (Date.now() + 1).toString();
        
        setState(prev => ({...prev, messages: [...prev.messages, { id: modelMessageId, role: 'model', text: '' }]}));

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                const newSources = chunk.candidates[0].groundingMetadata.groundingChunks
                    .map((c: any) => c.web || c.maps)
                    .filter(Boolean)
                    .map((s: any) => ({ uri: s.uri, title: s.title }));
                sources = [...sources, ...newSources];
            }
            setState(prev => ({
                ...prev,
                messages: prev.messages.map(msg => 
                msg.id === modelMessageId ? { ...msg, text: modelResponse, sources: [...new Set(sources.map(s => s.uri))].map(uri => sources.find(s => s.uri === uri)!) } : msg
            )}));
        }
    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        showError(`An error occurred: ${err.message}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
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
                Clear Chat
            </button>
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <AIIcon className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600">Hello! I'm Synapse.</h3>
                    <p className="text-slate-500 mt-1">What masterpiece shall we craft today?</p>
                </div>
            )}
            {messages.map((message, index) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className={`max-w-xl rounded-lg ${message.role === 'user' ? 'bg-emerald-600 text-white p-3' : 'bg-white text-slate-800 p-3 border border-slate-200'}`}>
                        <div className="text-sm whitespace-pre-wrap">
                            {message.text}
                            {isLoading && index === messages.length - 1 && message.role === 'model' && message.text.length === 0 && <BlinkingCursor />}
                        </div>
                        {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/75">
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">Sources:</h4>
                                <ul className="space-y-1.5">
                                    {message.sources.map((source) => (
                                        <li key={source.uri} className="flex items-start">
                                            <LinkIcon className="h-3.5 w-3.5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline break-words">
                                                {source.title || source.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {message.text && (
                            <div className={`flex justify-end mt-1 ${message.role === 'user' ? 'text-emerald-200' : 'text-slate-400'}`}>
                                <button onClick={() => handleCopy(message.text, message.id)} className={`p-1 rounded hover:bg-black/5 transition-colors`} title="Copy">
                                    {copiedMessageId === message.id ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
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
             <div className="flex items-center space-x-4 mb-2">
                <div className="flex items-center">
                    <input type="checkbox" id="useSearch" checked={useSearch} onChange={e => setState(prev => ({...prev, useSearch: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"/>
                    <label htmlFor="useSearch" className="ml-2 block text-sm text-gray-700">Use Google Search</label>
                </div>
                <div className="flex items-center">
                    <input type="checkbox" id="useMaps" checked={useMaps} onChange={e => setState(prev => ({...prev, useMaps: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"/>
                    <label htmlFor="useMaps" className="ml-2 block text-sm text-gray-700">Use Google Maps</label>
                </div>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
                onKeyDown={handleKeyDown}
                placeholder="Enter your question here... (Shift+Enter for new line)"
                className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
                disabled={isLoading}
                rows={3}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !prompt.trim()}
                className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="h-5 h-5" />
              </button>
            </div>
        </div>
    </div>
  );
};

export default Chat;
