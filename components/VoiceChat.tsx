import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { useError } from '../hooks/useError';
import { MicrophoneIcon, StopIcon, SparklesIcon, UserIcon, TrashIcon } from './icons';

type ConversationTurn = {
    id: string;
    speaker: 'user' | 'model';
    text: string;
}

interface VoiceChatProps {
    state: { conversation: ConversationTurn[] };
    setState: React.Dispatch<React.SetStateAction<VoiceChatProps['state']>>;
    onReset: () => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ state, setState, onReset }) => {
    const { conversation } = state;
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);
    const { showError } = useError();

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [conversation]);

    const startConversation = async () => {
        setIsConnecting(true);
        // Don't reset conversation here, so it persists if connection drops
        
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsMicActive(true);
                        
                        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        sourceNodeRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            const userInput = currentInputTranscription.current.trim();
                            const modelOutput = currentOutputTranscription.current.trim();
                            
                            const turnsToAdd: ConversationTurn[] = [];
                            if (userInput) {
                                turnsToAdd.push({ id: `user-${Date.now()}`, speaker: 'user', text: userInput });
                            }
                            if (modelOutput) {
                                turnsToAdd.push({ id: `model-${Date.now()}`, speaker: 'model', text: modelOutput });
                            }

                            if (turnsToAdd.length > 0) {
                                setState(prev => ({...prev, conversation: [...prev.conversation, ...turnsToAdd]}));
                            }

                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        showError(`An error occurred: ${e.message}`);
                        stopConversation();
                    },
                    onclose: () => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                },
            });
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            showError(`Failed to start: ${err.message}`);
            setIsConnecting(false);
        }
    };

    const stopConversation = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        sourceNodeRef.current?.disconnect();
        audioContextRef.current?.close().catch(console.error);

        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        outputAudioContextRef.current?.close().catch(console.error);

        setIsMicActive(false);
        setIsConnecting(false);
    };
    
    // Ensure cleanup on component unmount
    useEffect(() => {
        return () => stopConversation();
    }, []);

    const handleToggleConversation = () => {
        if (isMicActive || isConnecting) {
            stopConversation();
        } else {
            startConversation();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/75 flex justify-end items-center">
                <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                    <TrashIcon className="h-4 w-4" />
                    Clear Conversation
                </button>
            </div>
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
                {conversation.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <MicrophoneIcon className="w-16 h-16 text-slate-300 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-600">Live Voice Conversation</h3>
                        <p className="text-slate-500 mt-1">Tap the button below to start speaking.</p>
                    </div>
                )}
                {conversation.map(turn => (
                    <div key={turn.id} className={`flex items-start gap-3 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                        {turn.speaker === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div className={`max-w-md p-3 rounded-lg ${turn.speaker === 'user' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                            <p className="text-sm">{turn.text}</p>
                        </div>
                        {turn.speaker === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl text-center">
                <button
                    onClick={handleToggleConversation}
                    disabled={isConnecting}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 mx-auto ${isMicActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:bg-gray-400`}
                >
                    {isConnecting ? (
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : isMicActive ? (
                        <StopIcon className="h-8 w-8 text-white" />
                    ) : (
                        <MicrophoneIcon className="h-8 w-8 text-white" />
                    )}
                </button>
                <p className="text-slate-600 mt-2 text-sm">
                    {isConnecting ? "Connecting..." : isMicActive ? "Conversation is live. Tap to stop." : "Tap to start speaking."}
                </p>
            </div>
        </div>
    );
};

export default VoiceChat;