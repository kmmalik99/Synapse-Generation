import React, { useState, useEffect, useCallback } from 'react';
import { analyzeImageStream } from '../services/geminiService';
import { fileToBase64 } from '../utils/audio';
import { useError } from '../hooks/useError';
import { MagnifyingGlassCircleIcon, TrashIcon } from './icons';

interface ImageAnalystProps {
    state: { prompt: string, imageFile: File | null, imagePreview: string | null, analysis: string };
    setState: React.Dispatch<React.SetStateAction<ImageAnalystProps['state']>>;
    onReset: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
      <span className="text-gray-600 ml-2">Analyzing...</span>
    </div>
);

const ImageAnalyst: React.FC<ImageAnalystProps> = ({ state, setState, onReset }) => {
  const { prompt, imageFile, imagePreview, analysis } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();

  useEffect(() => {
    if (imageFile) {
      if (imagePreview && imagePreview.startsWith('blob:')) { // Don't re-create blob url if it exists
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({...prev, imagePreview: reader.result as string}));
      };
      reader.readAsDataURL(imageFile);
    } else {
      if (imagePreview) {
          setState(prev => ({ ...prev, imagePreview: null }));
      }
    }
  }, [imageFile, imagePreview, setState]);

  useEffect(() => {
    if (!isLoading && analysis) {
      (window as any).Prism?.highlightAll();
    }
  }, [isLoading, analysis]);

  const handleImageFileChange = (file: File | null) => {
    setState(prev => ({ ...prev, imageFile: file, analysis: '' }));
  };

  const handleAnalyze = async () => {
    if (!prompt.trim() || !imageFile) {
      showError('Please upload an image and enter a prompt.');
      return;
    }
    setIsLoading(true);
    setState(prev => ({...prev, analysis: ''}));

    try {
      const imageBase64 = await fileToBase64(imageFile);
      let fullResult = '';
      for await (const chunk of analyzeImageStream(prompt, imageBase64, imageFile.type)) {
        fullResult += chunk;
        setState(prev => ({...prev, analysis: fullResult}));
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(`Failed to analyze image: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-6">
      <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">1. Image & Question</h3>
           <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                <TrashIcon className="h-4 w-4" />
                Reset
            </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
              <h4 className="text-sm font-semibold text-slate-600 mb-2">Image to Analyze</h4>
              <label 
                  onDrop={onImageDrop}
                  onDragOver={onDragOver}
                  className="w-full h-48 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50 relative overflow-hidden"
              >
                  {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                  ) : (
                      <span className="text-slate-500 text-center text-sm">Click or drag & drop an image here</span>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)} className="hidden" />
              </label>
          </div>
          <div>
              <h4 className="text-sm font-semibold text-slate-600 mb-2">Your Question</h4>
              <textarea
              value={prompt}
              onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
              placeholder="e.g., What is happening in this image? Can you describe the main subject?"
              className="w-full h-48 p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
              />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-200/75 rounded-b-xl flex justify-end">
            <button
                onClick={handleAnalyze}
                disabled={isLoading || !imageFile || !prompt}
                className="w-full sm:w-auto bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
                <MagnifyingGlassCircleIcon className="h-5 w-5" />
                <span>Analyze Image</span>
            </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-200/75 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">2. Analysis Result</h3>
            {isLoading && <LoadingSpinner />}
        </div>
        <div className="p-6 min-h-[200px]">
          {analysis ? (
            <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap !bg-slate-800 !text-slate-200 rounded-md p-4"><code className="language-markdown font-sans">{analysis}</code></pre>
            </div>
          ) : !isLoading && (
            <p className="text-slate-500">The analysis of your image will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyst;