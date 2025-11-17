
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppMode, Message } from './types';
import PromptEnhancer from './components/PromptEnhancer';
import AppBuilder from './components/AppBuilder';
import ImageGenerator from './components/ImageGenerator';
import ImageAnalyst from './components/ImageAnalyst';
import ImageEditor from './components/ImageEditor';
import ImageAnimator from './components/ImageAnimator';
import VideoGenerator from './components/VideoGenerator';
import VideoEditor from './components/VideoEditor';
import VideoAnalyst from './components/VideoAnalyst';
import VoiceChat from './components/VoiceChat';
import TextToSpeech from './components/TextToSpeech';
import AudioTranscriber from './components/AudioTranscriber';
import Chat from './components/Chat';
import Auth from './components/Auth';
import Toast from './components/Toast';
import { useError } from './hooks/useError';
import { WandIcon, GithubIcon, PhotoIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, MicrophoneIcon, MagnifyingGlassCircleIcon, SpeakerWaveIcon, AIIcon, CubeTransparentIcon, PaintBrushIcon, VideoCameraSlashIcon, QueueListIcon, ArrowRightOnRectangleIcon, ScissorsIcon, Bars3Icon, FilmIcon } from './components/icons';
import DynamicBackground from './components/DynamicBackground';

const API_KEY = process.env.API_KEY;

// --- Initial States for Features ---
const initialChatState = { messages: [] as Message[], prompt: '', useSearch: false, useMaps: false, location: null as { lat: number, lng: number } | null };
const initialEnhancerState = { messages: [] as Message[], prompt: '' };
const initialAppBuilderState = { messages: [] as Message[], prompt: '', generatedCode: '<!-- Your generated app will appear here -->', enableThinking: false, attachment: null as any };
const initialImageGeneratorState = { prompt: '', aspectRatio: '1:1', imageUrl: '' };
const initialImageEditorState = { prompt: '', originalImageFile: null as File | null, originalImagePreview: null as string | null, editedImageUrl: null as string | null };
const initialImageAnalystState = { prompt: '', imageFile: null as File | null, imagePreview: null as string | null, analysis: '' };
const initialImageAnimatorState = { prompt: '', imageFile: null as File | null, imagePreview: null as string | null, aspectRatio: '16:9', resolution: '720p', videoUrl: null as string | null, loadingMessage: '' };
const initialVideoGeneratorState = { messages: [] as Message[], prompt: '', imageFile: null as File | null, imagePreview: null as string | null, aspectRatio: '16:9', resolution: '1080p', model: 'veo-3.1-fast-generate-preview' };
const initialVideoEditorState = { messages: [] as Message[], prompt: '' };
const initialVideoAnalystState = { prompt: '', videoFile: null as File | null, videoPreview: null as string | null, analysis: '' };
const initialVoiceChatState = { conversation: [] as { id: string; speaker: 'user' | 'model'; text: string; }[] };
const initialTextToSpeechState = { messages: [] as Message[], prompt: '', voice: 'Zephyr' };
const initialAudioTranscriberState = { transcript: '' };


// --- State Persistence Helpers ---

// Helper to load state from localStorage
const loadState = (key: string, initialState: any) => {
    try {
        const savedState = localStorage.getItem(key);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            // Merge with initial state to ensure all keys are present if the state shape has changed
            return { ...initialState, ...parsed };
        }
    } catch (error) {
        console.error(`Error loading state for "${key}" from localStorage:`, error);
    }
    return initialState;
};

// Helper to strip non-serializable 'content' from messages
const stripMessageContent = (messages: Message[]) => {
    if (!Array.isArray(messages)) return [];
    return messages.map(({ content, ...rest }) => rest);
};


const MissingApiKey: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen text-gray-800 p-4 bg-gray-50">
    <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-lg text-center">
      <h2 className="text-2xl font-bold text-red-700 mb-4">API Key Not Found</h2>
      <p className="text-red-600">
        This application requires a Google Gemini API key to function. Please make sure it is configured correctly in your environment variables.
      </p>
      <p className="mt-4 text-xs text-red-500">
        The application is expecting the key at <code>process.env.API_KEY</code>.
      </p>
    </div>
  </div>
);

const App: React.FC = () => {
  const { errorMessage, clearError } = useError();
  const [mode, setMode] = useState<AppMode>(AppMode.Chat);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // --- State Management for all features (with persistence) ---
  const [chatState, setChatState] = useState(() => loadState('chatState', initialChatState));
  const [enhancerState, setEnhancerState] = useState(() => loadState('enhancerState', initialEnhancerState));
  const [appBuilderState, setAppBuilderState] = useState(() => loadState('appBuilderState', initialAppBuilderState));
  const [imageGeneratorState, setImageGeneratorState] = useState(() => loadState('imageGeneratorState', initialImageGeneratorState));
  const [imageEditorState, setImageEditorState] = useState(() => loadState('imageEditorState', initialImageEditorState));
  const [imageAnalystState, setImageAnalystState] = useState(() => loadState('imageAnalystState', initialImageAnalystState));
  const [imageAnimatorState, setImageAnimatorState] = useState(() => loadState('imageAnimatorState', initialImageAnimatorState));
  const [videoGeneratorState, setVideoGeneratorState] = useState(() => loadState('videoGeneratorState', initialVideoGeneratorState));
  const [videoEditorState, setVideoEditorState] = useState(() => loadState('videoEditorState', initialVideoEditorState));
  const [videoAnalystState, setVideoAnalystState] = useState(() => loadState('videoAnalystState', initialVideoAnalystState));
  const [voiceChatState, setVoiceChatState] = useState(() => loadState('voiceChatState', initialVoiceChatState));
  const [textToSpeechState, setTextToSpeechState] = useState(() => loadState('textToSpeechState', initialTextToSpeechState));
  const [audioTranscriberState, setAudioTranscriberState] = useState(() => loadState('audioTranscriberState', initialAudioTranscriberState));

  // Shared state for video tools
  const [latestVideoOperation, setLatestVideoOperation] = useState<any | null>(() => loadState('latestVideoOperation', null));


  // --- State Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('chatState', JSON.stringify({ ...chatState, messages: stripMessageContent(chatState.messages) }));
  }, [chatState]);

  useEffect(() => {
    localStorage.setItem('enhancerState', JSON.stringify({ ...enhancerState, messages: stripMessageContent(enhancerState.messages) }));
  }, [enhancerState]);
  
  useEffect(() => {
    const { attachment, ...rest } = appBuilderState;
    localStorage.setItem('appBuilderState', JSON.stringify({ ...rest, messages: stripMessageContent(rest.messages) }));
  }, [appBuilderState]);

  useEffect(() => {
    localStorage.setItem('imageGeneratorState', JSON.stringify(imageGeneratorState));
  }, [imageGeneratorState]);

  useEffect(() => {
    const { originalImageFile, ...rest } = imageEditorState;
    localStorage.setItem('imageEditorState', JSON.stringify(rest));
  }, [imageEditorState]);

  useEffect(() => {
    const { imageFile, ...rest } = imageAnalystState;
    localStorage.setItem('imageAnalystState', JSON.stringify(rest));
  }, [imageAnalystState]);
  
  useEffect(() => {
    const { imageFile, ...rest } = imageAnimatorState;
    localStorage.setItem('imageAnimatorState', JSON.stringify(rest));
  }, [imageAnimatorState]);

  useEffect(() => {
    const { imageFile, ...rest } = videoGeneratorState;
    localStorage.setItem('videoGeneratorState', JSON.stringify({ ...rest, messages: stripMessageContent(rest.messages) }));
  }, [videoGeneratorState]);
  
  useEffect(() => {
    localStorage.setItem('videoEditorState', JSON.stringify({ ...videoEditorState, messages: stripMessageContent(videoEditorState.messages) }));
  }, [videoEditorState]);
  
  useEffect(() => {
    localStorage.setItem('latestVideoOperation', JSON.stringify(latestVideoOperation));
  }, [latestVideoOperation]);

  useEffect(() => {
    const { videoFile, ...rest } = videoAnalystState;
    localStorage.setItem('videoAnalystState', JSON.stringify(rest));
  }, [videoAnalystState]);

  useEffect(() => {
    localStorage.setItem('voiceChatState', JSON.stringify(voiceChatState));
  }, [voiceChatState]);

  useEffect(() => {
    localStorage.setItem('textToSpeechState', JSON.stringify({ ...textToSpeechState, messages: stripMessageContent(textToSpeechState.messages) }));
  }, [textToSpeechState]);

  useEffect(() => {
    localStorage.setItem('audioTranscriberState', JSON.stringify(audioTranscriberState));
  }, [audioTranscriberState]);


  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        setIsAuthenticated(true);
        setUsername(loggedInUser);
    }
  }, []);

  const handleLoginSuccess = useCallback((user: string) => {
    sessionStorage.setItem('loggedInUser', user);
    setUsername(user);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('loggedInUser');
    setUsername(null);
    setIsAuthenticated(false);
  }, []);


  const handleEnhanceComplete = useCallback((enhancedPrompt: string) => {
    const cleanedPrompt = enhancedPrompt.replace(/^```(?:\w+\n)?([\s\S]*)\n```$/, '$1').trim();
    // Set initial prompt for App Builder
    setAppBuilderState(prev => ({ ...prev, messages: [{ id: `user-${Date.now()}`, role: 'user', text: cleanedPrompt }] }));
    setMode(AppMode.AppBuilder);
  }, []);

  const navItems = useMemo(() => [
    { mode: AppMode.Chat, icon: ChatBubbleLeftRightIcon, label: "Chat" },
    { mode: AppMode.Enhancer, icon: WandIcon, label: "Prompt Enhancer" },
    { mode: AppMode.AppBuilder, icon: CubeTransparentIcon, label: "App Builder" },
    { type: 'divider' },
    { mode: AppMode.ImageGenerator, icon: PhotoIcon, label: "Image Generator" },
    { mode: AppMode.ImageEditor, icon: PaintBrushIcon, label: "Image Editor" },
    { mode: AppMode.ImageAnalyst, icon: MagnifyingGlassCircleIcon, label: "Image Analyst" },
    { mode: AppMode.ImageAnimator, icon: FilmIcon, label: "Image Animator" },
    { type: 'divider' },
    { mode: AppMode.VideoGenerator, icon: VideoCameraIcon, label: "Video Generator" },
    { mode: AppMode.VideoEditor, icon: ScissorsIcon, label: "Video Editor" },
    { mode: AppMode.VideoAnalyst, icon: VideoCameraSlashIcon, label: "Video Analyst" },
    { type: 'divider' },
    { mode: AppMode.VoiceChat, icon: MicrophoneIcon, label: "Voice Chat" },
    { mode: AppMode.TextToSpeech, icon: SpeakerWaveIcon, label: "Text to Speech" },
    { mode: AppMode.AudioTranscriber, icon: QueueListIcon, label: "Audio Transcriber" },
  ], []);

  const getSidebarLinkClass = (linkMode: AppMode) => {
    return `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 w-full ${
      mode === linkMode
        ? 'bg-slate-900 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`;
  };

  if (!API_KEY) {
    return <MissingApiKey />;
  }
  
  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const activeNavItem = navItems.find(item => item.type !== 'divider' && item.mode === mode);

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-gray-800 flex relative isolate overflow-hidden">
        {errorMessage && <Toast message={errorMessage} onClose={clearError} />}
        <DynamicBackground />
        
        <aside className="w-64 bg-slate-800 text-white flex flex-col shadow-2xl flex-shrink-0">
            <div className="h-16 flex items-center justify-center px-4 border-b border-slate-700/50">
                <AIIcon className="h-10 w-10 text-emerald-400" />
            </div>
            
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item, index) => (
                    item.type === 'divider' ? (
                        <hr key={`divider-${index}`} className="border-t border-slate-700/50 my-2" />
                    ) : (
                        <button
                            key={item.mode}
                            onClick={() => setMode(item.mode!)}
                            className={getSidebarLinkClass(item.mode!)}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </button>
                    )
                ))}
            </nav>
            
            <div className="p-4 border-t border-slate-700/50 space-y-2">
                 <div className="text-center text-sm text-slate-400 mb-2">
                    Logged in as <strong className="font-medium text-slate-300">{username}</strong>
                 </div>
                 <button onClick={handleLogout} className="w-full flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm py-2 px-3 bg-slate-700/50 hover:bg-slate-700 rounded-md">
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="ml-2">Logout</span>
                 </button>
                 <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm py-2 px-3 bg-slate-700/50 hover:bg-slate-700 rounded-md">
                    <GithubIcon className="h-5 w-5" />
                    <span className="ml-2">View on GitHub</span>
                </a>
            </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-y-auto">
            <header className="bg-white/70 backdrop-blur-lg border-b border-slate-200/75 sticky top-0 z-10 h-16 flex items-center justify-between px-4 sm:px-8">
                <h1 className="text-2xl font-bold text-slate-800">Synapse Generation</h1>
                {activeNavItem && <h2 className="text-xl font-semibold text-slate-600">{activeNavItem.label}</h2>}
            </header>
            
            <main className="flex-grow p-4 sm:p-6 lg:p-8">
                <div className="h-full">
                    <div className={mode === AppMode.Chat ? 'h-full' : 'hidden'}>
                        <Chat state={chatState} setState={setChatState} onReset={() => setChatState(initialChatState)} />
                    </div>
                    <div className={mode === AppMode.Enhancer ? 'h-full' : 'hidden'}>
                        <PromptEnhancer state={enhancerState} setState={setEnhancerState} onReset={() => setEnhancerState(initialEnhancerState)} onEnhanceComplete={handleEnhanceComplete} />
                    </div>
                    <div className={mode === AppMode.AppBuilder ? 'h-full' : 'hidden'}>
                        <AppBuilder state={appBuilderState} setState={setAppBuilderState} onReset={() => setAppBuilderState(initialAppBuilderState)} />
                    </div>
                    <div className={mode === AppMode.ImageGenerator ? 'h-full' : 'hidden'}>
                        <ImageGenerator state={imageGeneratorState} setState={setImageGeneratorState} onReset={() => setImageGeneratorState(initialImageGeneratorState)} />
                    </div>
                    <div className={mode === AppMode.ImageEditor ? 'h-full' : 'hidden'}>
                         <ImageEditor state={imageEditorState} setState={setImageEditorState} onReset={() => setImageEditorState(initialImageEditorState)} />
                    </div>
                    <div className={mode === AppMode.ImageAnalyst ? 'h-full' : 'hidden'}>
                        <ImageAnalyst state={imageAnalystState} setState={setImageAnalystState} onReset={() => setImageAnalystState(initialImageAnalystState)} />
                    </div>
                    <div className={mode === AppMode.ImageAnimator ? 'h-full' : 'hidden'}>
                        <ImageAnimator state={imageAnimatorState} setState={setImageAnimatorState} onReset={() => setImageAnimatorState(initialImageAnimatorState)} />
                    </div>
                    <div className={mode === AppMode.VideoGenerator ? 'h-full' : 'hidden'}>
                        <VideoGenerator 
                            state={videoGeneratorState} 
                            setState={setVideoGeneratorState} 
                            onReset={() => {
                                setVideoGeneratorState(initialVideoGeneratorState);
                                setLatestVideoOperation(null); // Also clear the shared operation
                            }} 
                            onGenerationComplete={setLatestVideoOperation}
                         />
                    </div>
                    <div className={mode === AppMode.VideoEditor ? 'h-full' : 'hidden'}>
                        <VideoEditor
                            state={videoEditorState}
                            setState={setVideoEditorState}
                            onReset={() => setVideoEditorState(initialVideoEditorState)}
                            latestVideoOperation={latestVideoOperation}
                            setLatestVideoOperation={setLatestVideoOperation}
                            switchToGenerator={() => setMode(AppMode.VideoGenerator)}
                        />
                    </div>
                    <div className={mode === AppMode.VideoAnalyst ? 'h-full' : 'hidden'}>
                        <VideoAnalyst state={videoAnalystState} setState={setVideoAnalystState} onReset={() => setVideoAnalystState(initialVideoAnalystState)} />
                    </div>
                    <div className={mode === AppMode.VoiceChat ? 'h-full' : 'hidden'}>
                        <VoiceChat state={voiceChatState} setState={setVoiceChatState} onReset={() => setVoiceChatState(initialVoiceChatState)} />
                    </div>
                    <div className={mode === AppMode.TextToSpeech ? 'h-full' : 'hidden'}>
                        <TextToSpeech state={textToSpeechState} setState={setTextToSpeechState} onReset={() => setTextToSpeechState(initialTextToSpeechState)} />
                    </div>
                    <div className={mode === AppMode.AudioTranscriber ? 'h-full' : 'hidden'}>
                        <AudioTranscriber state={audioTranscriberState} setState={setAudioTranscriberState} onReset={() => setAudioTranscriberState(initialAudioTranscriberState)} />
                    </div>
                </div>
            </main>

            <footer className="py-4 text-center text-sm text-gray-400">
                <p>Powered by Google Gemini</p>
            </footer>
        </div>
    </div>
  );
};

export default App;