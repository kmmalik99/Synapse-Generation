

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from '../utils/audio';
import { Message } from '../types';
import { useError } from '../hooks/useError';
import { VideoCameraIcon, SparklesIcon, UserIcon, TrashIcon } from './icons';
import { generateVideo } from '../services/geminiService';

interface VideoGeneratorProps {
    state: {
        messages: Message[],
        prompt: string,
        imageFile: File | null,
        imagePreview: string | null,
        aspectRatio: string,
        resolution: string,
        model: string,
    };
    setState: React.Dispatch<React.SetStateAction<VideoGeneratorProps['state']>>;
    onReset: () => void;
    onGenerationComplete: (operation: any) => void;
}

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Casting pixels for their big roles...",
    "The digital film is rolling...",
    "Rendering scene by scene...",
    "This can take a few minutes, please wait...",
    "Finalizing the special effects...",
    "Polishing the final cut..."
];

const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ state, setState, onReset, onGenerationComplete }) => {  
  const { messages, prompt, imageFile, imagePreview, aspectRatio, resolution, model } = state;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const { showError } = useError();
  const [apiKeySelected, setApiKeySelected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => setState(prev => ({...prev, imagePreview: reader.result as string}));
      reader.readAsDataURL(imageFile);
    } else {
      // Only update state if there's a preview to clear, to avoid a re-render
      if (imagePreview) {
        setState(prev => ({...prev, imagePreview: null}));
      }
    }
  }, [imageFile, setState]); // This effect now correctly depends only on the file

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
            const currentIndex = loadingMessages.indexOf(prev);
            return loadingMessages[(currentIndex + 1) % loadingMessages.length];
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handleImageFileChange = useCallback((file: File | null) => {
      setState(prev => ({ ...prev, imageFile: file }));
  }, [setState]);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    const modelMessageId = `model-${Date.now()}`;
    
    setState(prev => ({ ...prev, messages: [...prev.messages, userMessage], prompt: '', imageFile: null }));
    
    setIsLoading(true);

    setTimeout(() => {
        setState(prev => ({ ...prev, messages: [...prev.messages, { id: modelMessageId, role: 'model', text: '' }]}));
    }, 100);

    try {
        let finalOperation: any = null;
        for await (const result of generateVideo(prompt, imageFile, (updateMsg) => {
            setState(prev => ({
                ...prev,
                messages: prev.messages.map(msg => 
                    msg.id === modelMessageId ? { ...msg, text: updateMsg } : msg
                )
            }));
        }, aspectRatio, resolution)) {
            const { videoUrl, operation } = result;
            const videoContent = <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-full object-contain rounded-md bg-black" />;
            setState(prev => ({
                ...prev,
                messages: prev.messages.map(msg => 
                    msg.id === modelMessageId ? { ...msg, text: 'Video generation complete!', content: videoContent } : msg
                )
            }));
            finalOperation = operation;
        }

        if (finalOperation) {
            onGenerationComplete(finalOperation);
        } else {
            throw new Error("Video generation finished without returning a result.");
        }

    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        let errorMessage = `Failed to generate video: ${err.message}`;
        if (err.message.includes("Requested entity was not found")) {
            errorMessage = "API Key error. Please re-select your key and try again.";
            setApiKeySelected(false);
        }
        showError(errorMessage);
        setState(prev => ({ ...prev, messages: prev.messages.filter(m => m.id !== modelMessageId)}));
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

  const handleSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setApiKeySelected(true); 
  };
  
  if (!apiKeySelected) {
    return (
        <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">API Key Required for Video Generation</h3>
            <p className="text-slate-600 mb-4">The Veo model requires you to select a project-linked API key. Please select your key to continue.</p>
            <p className="text-xs text-slate-500 mb-4">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">billing documentation</a>.</p>
            <button onClick={handleSelectKey} className="bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-emerald-700">
                Select API Key
            </button>
        </div>
    );
  }

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
                        <p className="text-sm">Welcome to the Video Generator. I'm Synapse. Describe a scene, provide an optional starting image, and I will direct and render your vision into video.</p>
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
                    <div className={`max-w-2xl rounded-lg ${message.role === 'user' ? 'bg-emerald-600 text-white p-3' : 'bg-white text-slate-800 p-3 border border-slate-200'}`}>
                        <div className="text-sm whitespace-pre-wrap">
                            {message.text}
                            {isLoading && index === messages.length - 1 && !message.content && <BlinkingCursor />}
                        </div>
                        {message.content && <div className="mt-2 aspect-video">{message.content}</div>}
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
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <div>
                  <label htmlFor="model" className="block text-xs font-medium text-slate-600 mb-1">Quality</label>
                  <select id="model" value={model} onChange={(e) => setState(prev=>({...prev, model: e.target.value}))} className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500">
                      <option value="veo-3.1-fast-generate-preview">Fast</option>
                      <option value="veo-3.1-generate-preview">Advanced</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="aspectRatio" className="block text-xs font-medium text-slate-600 mb-1">Aspect Ratio</label>
                  <select id="aspectRatio" value={aspectRatio} onChange={(e) => setState(prev=>({...prev, aspectRatio: e.target.value}))} className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500">
                      <option value="16:9">Landscape</option>
                      <option value="9:16">Portrait</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="resolution" className="block text-xs font-medium text-slate-600 mb-1">Resolution</label>
                  <select id="resolution" value={resolution} onChange={(e) => setState(prev=>({...prev, resolution: e.target.value}))} className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500">
                      <option value="720p">HD (720p)</option>
                      <option value="1080p">Full HD (1080p)</option>
                  </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start Image</label>
                <label className="w-full h-[35px] flex items-center justify-center border border-slate-300 rounded-md cursor-pointer hover:border-emerald-500 transition-colors bg-white text-sm text-slate-700">
                    {imageFile ? <span className="truncate px-2">{imageFile.name}</span> : <span>Upload...</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>
           </div>
          <div className="flex items-start gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setState(prev=>({...prev, prompt: e.target.value}))}
              onKeyDown={handleKeyDown}
              placeholder="Describe the video you want to create..."
              className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
              disabled={isLoading}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !prompt.trim()}
              className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0 self-stretch"
              aria-label="Generate video"
            >
              <VideoCameraIcon className="h-5 w-5" />
            </button>
          </div>
      </div>
  </div>
  );
};

export default VideoGenerator;