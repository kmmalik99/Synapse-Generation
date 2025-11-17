import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { extendVideo } from '../services/geminiService';
import { useError } from '../hooks/useError';
import { ScissorsIcon, SparklesIcon, UserIcon, TrashIcon, VideoCameraIcon } from './icons';

interface VideoEditorProps {
    state: { messages: Message[], prompt: string };
    setState: React.Dispatch<React.SetStateAction<VideoEditorProps['state']>>;
    onReset: () => void;
    latestVideoOperation: any | null;
    setLatestVideoOperation: (operation: any | null) => void;
    switchToGenerator: () => void;
}

const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;

const VideoEditor: React.FC<VideoEditorProps> = ({ state, setState, onReset, latestVideoOperation, setLatestVideoOperation, switchToGenerator }) => {
    const { messages, prompt } = state;
    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        (async () => {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        })();
    }, []);

    // Effect to load the latest video when the component is shown or the operation changes
    useEffect(() => {
        if (latestVideoOperation) {
            const fetchVideo = async () => {
                setIsLoading(true);
                try {
                    const downloadLink = latestVideoOperation.response?.generatedVideos?.[0]?.video?.uri;
                    if (downloadLink) {
                        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                        if (!response.ok) throw new Error(`Failed to download video (status: ${response.status}).`);
                        
                        const blob = await response.blob();
                        const newVideoUrl = URL.createObjectURL(blob);
                        setVideoUrl(newVideoUrl);
                        
                        // Set initial message with the video to edit
                        const videoContent = <video src={newVideoUrl} controls autoPlay loop className="max-w-full max-h-full object-contain rounded-md bg-black" />;
                        setState({
                            prompt: '',
                            messages: [{ id: `model-${Date.now()}`, role: 'model', text: 'This is the latest video. What should happen next?', content: videoContent }]
                        });
                    } else {
                        setVideoUrl(null);
                        setState({ prompt: '', messages: [] });
                    }
                } catch (e) {
                    showError(e instanceof Error ? e.message : String(e));
                } finally {
                    setIsLoading(false);
                }
            };
            fetchVideo();
        } else {
            setVideoUrl(null);
            setState({ prompt: '', messages: [] });
        }

        // Cleanup blob URL
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [latestVideoOperation]); // Dependency on the operation object itself

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleExtend = async () => {
        if (!prompt.trim() || !latestVideoOperation) return;

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
        const modelMessageId = `model-${Date.now()}`;
        
        setState(prev => ({ ...prev, messages: [...prev.messages, userMessage], prompt: '' }));
        setIsLoading(true);

        setTimeout(() => {
            setState(prev => ({ ...prev, messages: [...prev.messages, { id: modelMessageId, role: 'model', text: '' }]}));
        }, 100);

        try {
            let finalOperation: any = null;
            for await (const result of extendVideo(prompt, latestVideoOperation, (updateMsg) => {
                setState(prev => ({
                    ...prev,
                    messages: prev.messages.map(msg => 
                        msg.id === modelMessageId ? { ...msg, text: updateMsg } : msg
                    )
                }));
            })) {
                const { videoUrl: newVideoUrl, newOperation } = result;
                const videoContent = <video src={newVideoUrl} controls autoPlay loop className="max-w-full max-h-full object-contain rounded-md bg-black" />;
                setState(prev => ({
                    ...prev,
                    messages: prev.messages.map(msg => 
                        msg.id === modelMessageId ? { ...msg, text: 'Video extended successfully!', content: videoContent } : msg
                    )
                }));
                finalOperation = newOperation;
            }

            if (finalOperation) {
                setLatestVideoOperation(finalOperation); // Update the shared state for the next extension
            } else {
                throw new Error("Video extension finished without returning a result.");
            }
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            let errorMessage = `Failed to extend video: ${err.message}`;
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
            handleExtend();
        }
    };

    const handleSelectKey = async () => {
        await (window as any).aistudio.openSelectKey();
        setApiKeySelected(true);
    };

    if (!apiKeySelected) {
        return (
            <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm p-8 text-center h-full flex flex-col justify-center items-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">API Key Required for Video Editing</h3>
                <p className="text-slate-600 mb-4 max-w-md">The Veo model requires you to select a project-linked API key. Please select your key to continue.</p>
                <p className="text-xs text-slate-500 mb-4">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">billing documentation</a>.</p>
                <button onClick={handleSelectKey} className="bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-emerald-700">
                    Select API Key
                </button>
            </div>
        );
    }

    if (!latestVideoOperation) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center bg-white border border-slate-200/75 rounded-xl shadow-sm p-8">
                <ScissorsIcon className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">Video Editor</h3>
                <p className="text-slate-500 mt-1 mb-4 max-w-sm">No video available to edit. Please generate a video first, and then return here to extend it.</p>
                <button
                    onClick={switchToGenerator}
                    className="bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <VideoCameraIcon className="h-5 w-5" />
                    <span>Go to Video Generator</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/75 flex justify-end items-center">
                <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                    <TrashIcon className="h-4 w-4" />
                    Clear History
                </button>
            </div>
            <div ref={messagesEndRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
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
            </div>
            <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
                <div className="flex items-start gap-2">
                    <textarea
                        value={prompt}
                        onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what should happen next..."
                        className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
                        disabled={isLoading}
                        rows={2}
                    />
                    <button
                        onClick={handleExtend}
                        disabled={isLoading || !prompt.trim()}
                        className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0 self-stretch"
                        aria-label="Extend video"
                    >
                        <ScissorsIcon className="h-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoEditor;