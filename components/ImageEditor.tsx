import React, { useState, useEffect, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/audio';
import { useError } from '../hooks/useError';
import { PaintBrushIcon, TrashIcon } from './icons';

interface ImageEditorProps {
    state: { prompt: string, originalImageFile: File | null, originalImagePreview: string | null, editedImageUrl: string | null };
    setState: React.Dispatch<React.SetStateAction<ImageEditorProps['state']>>;
    onReset: () => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600">Editing image...</span>
    </div>
);

const ImageEditor: React.FC<ImageEditorProps> = ({ state, setState, onReset }) => {
  const { prompt, originalImageFile, originalImagePreview, editedImageUrl } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();

  useEffect(() => {
    if (originalImageFile) {
        if (originalImagePreview) return; // Don't re-create blob url if it exists
        const reader = new FileReader();
        reader.onloadend = () => {
            setState(prev => ({ ...prev, originalImagePreview: reader.result as string }));
        };
        reader.readAsDataURL(originalImageFile);
    } else {
        if (originalImagePreview) {
            setState(prev => ({ ...prev, originalImagePreview: null }));
        }
    }
  }, [originalImageFile, originalImagePreview, setState]);
  
  const handleImageFileChange = (file: File | null) => {
      // Clear previous edit when new image is uploaded
      setState(prev => ({...prev, originalImageFile: file, editedImageUrl: null}));
  }

  const handleEdit = async () => {
    if (!prompt.trim() || !originalImageFile) {
      showError('Please upload an image and enter an edit instruction.');
      return;
    }
    setIsLoading(true);
    setState(prev => ({...prev, editedImageUrl: null}));

    try {
      const imageBase64 = await fileToBase64(originalImageFile);
      const url = await editImage(prompt, imageBase64, originalImageFile.type);
      setState(prev => ({...prev, editedImageUrl: url}));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(`Failed to edit image: ${err.message}`);
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
          <h3 className="text-lg font-semibold text-slate-800">1. Image & Edit Instruction</h3>
            <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                <TrashIcon className="h-4 w-4" />
                Reset
            </button>
        </div>
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Original Image</h4>
                    <label 
                        onDrop={onImageDrop}
                        onDragOver={onDragOver}
                        className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50 relative overflow-hidden"
                    >
                        {originalImagePreview ? (
                            <img src={originalImagePreview} alt="Original" className="h-full w-full object-contain" />
                        ) : (
                            <span className="text-slate-500 text-center text-sm p-4">Click or drag & drop an image here</span>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                </div>
                 <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Edit Instruction</h4>
                    <textarea
                    value={prompt}
                    onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))}
                    placeholder="e.g., Add a retro filter, or remove the person in the background"
                    className="w-full h-24 p-3 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none"
                    />
                </div>
            </div>
        </div>
        <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-200/75 rounded-b-xl flex justify-end">
            <button
                onClick={handleEdit}
                disabled={isLoading || !originalImageFile || !prompt}
                className="w-full sm:w-auto bg-emerald-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
                <PaintBrushIcon className="h-5 w-5" />
                <span>Apply Edit</span>
            </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/75 rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-200/75">
            <h3 className="text-lg font-semibold text-slate-800">2. Edited Image</h3>
        </div>
        <div className="p-6">
            <div className="flex-grow bg-slate-100 rounded-md flex items-center justify-center p-4 border border-slate-200 min-h-[400px]">
                {isLoading && <LoadingSpinner />}
                {!isLoading && editedImageUrl && (
                    <img src={editedImageUrl} alt="Edited" className="max-w-full max-h-full object-contain rounded-md" style={{maxHeight: '60vh'}}/>
                )}
                {!isLoading && !editedImageUrl && (
                    <p className="text-slate-500 text-center">Your edited image will appear here.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;