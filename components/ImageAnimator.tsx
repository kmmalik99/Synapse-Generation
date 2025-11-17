

import React, { useState, useEffect, useCallback } from 'react';
import { generateVideo } from '../services/geminiService';
import { useError } from '../hooks/useError';
import { FilmIcon, TrashIcon } from './icons';

interface ImageAnimatorProps {
    state: {
        prompt: string;
        imageFile: File | null;
        imagePreview: string | null;
        aspectRatio: string;
        resolution: string;
        videoUrl: string | null;
        loadingMessage: string;
    };
    setState: React.Dispatch<React.SetStateAction<ImageAnimatorProps['state']>>;
    onReset: () => void;
}

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600 font-medium">Generating video...</span>
      <span className="text-gray-500 text-sm animate-pulse">{message}</span>
    </div>
);

const ImageAnimator: React.FC<ImageAnimatorProps> = ({ state, setState, onReset }) => {
    const { prompt, imageFile, imagePreview, aspectRatio, resolution, videoUrl, loadingMessage } = state;

    const [isLoading, setIsLoading] = useState(false);
    const { showError } = useError();
    const [apiKeySelected, setApiKeySelected] = useState(false);

    useEffect(() => {
        (async () => {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        })();
    }, []);
    
    useEffect(() => {
        let objectUrl: string | undefined;
        if (imageFile) {
            if (imagePreview && imagePreview.startsWith('blob:')) return; // Avoid re-creating blob url
            objectUrl = URL.createObjectURL(imageFile);
            setState(prev => ({ ...prev, imagePreview: objectUrl }));
        }
        
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        }
    }, [imageFile]);

    const handleImageFileChange = (file: File | null) => {
        setState(prev => ({ ...prev, imageFile: file, videoUrl: null }));
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || !imageFile) {
            showError('Please upload an image and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setState(prev => ({...prev, videoUrl: null, loadingMessage: "Initializing..."}));

        try {
            for await (const result of generateVideo(
                prompt,
                imageFile,
                (updateMsg) => setState(prev => ({ ...prev, loadingMessage: updateMsg })),
                aspectRatio,
                resolution
            )) {
                const { videoUrl: generatedUrl } = result;
                setState(prev => ({ ...prev, videoUrl: generatedUrl }));
            }
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            let errorMessage = `Failed to generate video: ${err.message}`;
            if (err.message.includes("Requested entity was not found")) {
                errorMessage = "API Key error. Please re-select your key and try again.";
                setApiKeySelected(false);
            }
            showError(errorMessage);
        } finally {
            setIsLoading(false);
            setState(prev => ({ ...prev, loadingMessage: '' }));
        }
    };
    
    const onImageDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageFileChange(e.dataTransfer.files[0]);
        }
    }, [setState]);

    const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }

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
        <div className="space-y-6 h-full overflow-y-auto pb-6">
            <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
                <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">1. Animation Inputs</h3>
                    <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                        <TrashIcon className="h-4 w-4" />
                        Reset
                    </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-600 mb-2">Starting Image</h4>
                        <label 
                            onDrop={onImageDrop}
                            onDragOver={onDragOver}
                            className="w-full aspect-video flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50 relative overflow-hidden"
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                            ) : (
                                <span className="text-slate-500 text-center text-sm p-4">Click or drag & drop an image here</span>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)} className="hidden" />
                        </label>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-600 mb-2">Animation Prompt</h4>
                            <textarea
                                value={prompt}
                                onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
                                placeholder="e.g., Make the clouds move slowly, sun rays shining through"
                                className="w-full h-24 p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="aspectRatio" className="text-sm font-medium text-slate-600 mb-1 block">Aspect Ratio</label>
                                <select 
                                    id="aspectRatio"
                                    value={aspectRatio}
                                    onChange={(e) => setState(prev => ({...prev, aspectRatio: e.target.value}))}
                                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                >
                                    <option value="16:9">Landscape (16:9)</option>
                                    <option value="9:16">Portrait (9:16)</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="resolution" className="text-sm font-medium text-slate-600 mb-1 block">Resolution</label>
                                <select 
                                    id="resolution"
                                    value={resolution}
                                    onChange={(e) => setState(prev => ({...prev, resolution: e.target.value}))}
                                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                >
                                    <option value="720p">HD (720p)</option>
                                    <option value="1080p">Full HD (1080p)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-200/75 rounded-b-xl flex justify-end">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !imageFile || !prompt}
                        className="w-full sm:w-auto bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <FilmIcon className="h-5 w-5" />
                        <span>Animate Image</span>
                    </button>
                </div>
            </div>
            <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
                <div className="p-6 border-b border-slate-200/75">
                    <h3 className="text-lg font-semibold text-slate-800">2. Generated Video</h3>
                </div>
                <div className="p-6">
                    <div className="flex-grow bg-slate-100 rounded-md flex items-center justify-center p-4 border border-slate-200 min-h-[300px]">
                        {isLoading && <LoadingState message={loadingMessage} />}
                        {!isLoading && videoUrl && (
                            <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-full object-contain rounded-md bg-black" style={{maxHeight: '60vh'}} />
                        )}
                        {!isLoading && !videoUrl && (
                            <p className="text-slate-500 text-center">Your animated video will appear here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnimator;