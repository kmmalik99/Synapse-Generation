
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { useError } from '../hooks/useError';
import { PhotoIcon, ArrowDownTrayIcon, TrashIcon, SparklesIcon } from './icons';

interface ImageGeneratorProps {
  state: { prompt: string; aspectRatio: string; imageUrl: string | null };
  setState: React.Dispatch<React.SetStateAction<ImageGeneratorProps['state']>>;
  onReset: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600">Generating image...</span>
      <span className="text-gray-500 text-sm">This may take a moment.</span>
    </div>
);

const featureGraphicTemplates = [
    { 
        label: "Digital Neural Network", 
        prompt: "A futuristic feature graphic showing a glowing digital brain composed of interconnecting nodes and code syntax, emerald green and deep blue neon lighting, dark background, 3D render, 8k resolution, symbolizing AI intelligence." 
    },
    { 
        label: "Creative Workflow", 
        prompt: "A split-screen artistic composition: on the left, a minimalist code editor; on the right, a vibrant, explosion of colorful creative assets (images, video icons, sound waves), demonstrating creation from code, cinematic lighting." 
    },
    { 
        label: "Holographic App Builder", 
        prompt: "A high-tech isometric view of a holographic smartphone interface floating above a sleek desk, surrounded by floating UI components and tool icons, depth of field, premium glass texture, professional software vibes." 
    },
    { 
        label: "Voice to Action", 
        prompt: "Abstract 3D visualization of sound waves transforming into solid geometric shapes and video frames, representing voice-controlled content creation, dynamic motion, vivid colors against a dark slate background." 
    },
    { 
        label: "Synapse Studio Hub", 
        prompt: "A wide-angle shot of a modern, virtual creative studio workspace with multiple floating screens displaying video editing timelines, image generation galleries, and chat interfaces, ultra-realistic, clean design." 
    }
];

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ state, setState, onReset }) => {
  const { prompt, aspectRatio, imageUrl } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showError('Please enter a prompt for the image.');
      return;
    }
    setIsLoading(true);
    setState(prev => ({ ...prev, imageUrl: null }));
    
    try {
        const url = await generateImage(prompt, aspectRatio);
        setState(prev => ({ ...prev, imageUrl: url }));
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        showError(`Failed to generate image: ${error.message}`);
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-6">
      <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">1. Image Prompt</h3>
            <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                <TrashIcon className="h-4 w-4" />
                Reset
            </button>
        </div>
        <div className="p-6 space-y-4">
            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-emerald-500" />
                    Feature Graphic Templates
                </label>
                <div className="flex flex-wrap gap-2 mb-1">
                    {featureGraphicTemplates.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => setState(prev => ({...prev, prompt: t.prompt, aspectRatio: '16:9'}))}
                            className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-full transition-colors"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <textarea
            value={prompt}
            onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
            placeholder="e.g., A cinematic shot of a chrome robot holding a glowing red flower in a rainy, neon-lit city street"
            className="w-full h-24 p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
            />
            <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                 <div>
                    <label htmlFor="aspectRatio" className="text-sm font-medium text-slate-600 mr-2">Aspect Ratio:</label>
                    <select 
                        id="aspectRatio"
                        value={aspectRatio}
                        onChange={(e) => setState(prev => ({...prev, aspectRatio: e.target.value}))}
                        className="bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    >
                        <option value="1:1">Square (1:1)</option>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="9:16">Portrait (9:16)</option>
                        <option value="4:3">Standard (4:3)</option>
                        <option value="3:4">Standard Portrait (3:4)</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-slate-600 mr-2">Quality:</label>
                    <span className="inline-block text-sm font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-md">Ultra (4K+ Equivalent)</span>
                </div>
            </div>
        </div>
        <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-200/75 rounded-b-xl flex justify-end">
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full sm:w-auto bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
                <PhotoIcon className="h-5 w-5" />
                <span>Generate Image</span>
            </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
         <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">2. Generated Image</h3>
            {imageUrl && !isLoading && (
                <a 
                    href={imageUrl} 
                    download={`ai-image-${Date.now()}.jpeg`}
                    className="text-sm flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md transition-colors font-medium"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download
                </a>
            )}
        </div>
        <div className="p-6 min-h-[400px]">
            <div className="flex-grow bg-slate-100 rounded-md flex items-center justify-center p-4 border border-slate-200 min-h-[400px]">
                {isLoading && <LoadingSpinner />}
                {!isLoading && imageUrl && (
                    <img src={imageUrl} alt={prompt} className="max-w-full max-h-full object-contain rounded-md" style={{maxHeight: '60vh'}}/>
                )}
                {!isLoading && !imageUrl && (
                    <p className="text-slate-500 text-center">Your generated image will appear here.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
