import React, { useState, useRef, useEffect } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { useError } from '../hooks/useError';
import { MicrophoneIcon, StopIcon, QueueListIcon, CheckIcon, ClipboardIcon, TrashIcon } from './icons';

interface AudioTranscriberProps {
    state: { transcript: string };
    setState: React.Dispatch<React.SetStateAction<AudioTranscriberProps['state']>>;
    onReset: () => void;
}

const AudioTranscriber: React.FC<AudioTranscriberProps> = ({ state, setState, onReset }) => {
    const { transcript } = state;
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();
    const [isCopied, setIsCopied] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        onReset(); // Clear previous transcript before starting new recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = handleTranscription;
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            showError('Could not access microphone. Please grant permission and try again.');
            console.error('Microphone access error:', err);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // Stop all media tracks to turn off the mic indicator
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsLoading(true); // Start loading while we transcribe
        }
    };

    const handleTranscription = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            try {
                let fullResult = '';
                for await (const chunk of transcribeAudio(base64Audio, audioBlob.type)) {
                    fullResult += chunk;
                    setState({ transcript: fullResult });
                }
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                showError(`Transcription failed: ${err.message}`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
    };

    const handleCopy = () => {
        if (!transcript) return;
        navigator.clipboard.writeText(transcript);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
                 <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">1. Record Audio</h3>
                    <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                        <TrashIcon className="h-4 w-4" />
                        Clear Transcript
                    </button>
                </div>
                <div className="p-6 flex flex-col items-center justify-center space-y-4">
                    <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 text-white ${
                            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                    >
                        {isRecording ? <StopIcon className="h-10 w-10" /> : <MicrophoneIcon className="h-10 w-10" />}
                    </button>
                    <p className="text-slate-600">
                        {isRecording ? 'Recording...' : 'Tap to start recording'}
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
                <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">2. Transcription</h3>
                    {transcript && !isLoading && (
                        <button onClick={handleCopy} className="text-sm flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md transition-colors font-medium">
                            {isCopied ? <CheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                            {isCopied ? 'Copied' : 'Copy'}
                        </button>
                    )}
                </div>
                <div className="p-6 min-h-[200px] bg-slate-50 rounded-b-xl">
                    {isLoading ? (
                        <div className="flex items-center text-slate-500">
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                            <span>Transcribing...</span>
                        </div>
                    ) : transcript ? (
                        <p className="text-slate-800 whitespace-pre-wrap">{transcript}</p>
                    ) : (
                        <p className="text-slate-500">Your transcript will appear here.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioTranscriber;