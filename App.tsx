
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
import { WandIcon, GithubIcon, PhotoIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, MicrophoneIcon, MagnifyingGlassCircleIcon, SpeakerWaveIcon, AIIcon, CubeTransparentIcon, PaintBrushIcon, VideoCameraSlashIcon, QueueListIcon, ArrowRightOnRectangleIcon, ScissorsIcon, FilmIcon, ChevronLeftIcon, ChevronRightIcon, DevicePhoneMobileIcon } from './components/icons';
import DynamicBackground from './components/DynamicBackground';

const API_KEY = process.env.API_KEY;

// --- Initial States for Features ---
const initialChatState = { messages: [] as Message[], prompt: '', useSearch: false, useMaps: false, location: null as { lat: number, lng: number } | null };
const initialEnhancerState = { messages: [] as Message[], prompt: '' };
const initialAppBuilderState = { messages: [] as Message[], prompt: '', generatedCode: '<!-- Your generated app will appear here -->', enableThinking: false, attachment: null as any };
const initialImageGeneratorState = { prompt: '', aspectRatio: '1:1', imageUrl: null as string | null };
const initialImageEditorState = { prompt: '', originalImageFile: null as File | null, originalImagePreview: null as string | null, editedImageUrl: null as string | null };
const initialImageAnalystState = { prompt: '', imageFile: null as File | null, imagePreview: null as string | null, analysis: '' };
const initialImageAnimatorState = { prompt: '', imageFile: null as File | null, imagePreview: null as string | null, aspectRatio: '16:9', resolution: '720p', videoUrl: null as string | null, loadingMessage: '' };
const initialVideoGeneratorState = { messages: [] as Message[], prompt: '', imageFile: null as File | null, imagePreview: null as string | null, aspectRatio: '16:9', resolution: '1080p', model: 'veo-3.1-fast-generate-preview' };
const initialVideoEditorState = { messages: [] as Message[], prompt: '' };
const initialVideoAnalystState = { prompt: '', videoFile: null as File | null, videoPreview: null as string | null, analysis: '' };
const initialVoiceChatState = { conversation: [] as { id: string; speaker: 'user' | 'model'; text: string; }[] };
const initialTextToSpeechState = { messages: [] as Message[], prompt: '', voice: 'Zephyr' };
const initialAudioTranscriberState = { transcript: '' };
const initialSavedPromptsState = [] as string[];


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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
  const [savedPrompts, setSavedPrompts] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem('savedPrompts');
        return saved ? JSON.parse(saved) : initialSavedPromptsState;
    } catch (e) {
        return initialSavedPromptsState;
    }
  });

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
    localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
  }, [savedPrompts]);


  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        setIsAuthenticated(true);
        setUsername(loggedInUser);
    }
  }, []);

  useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      const handleBeforeInstallPrompt = (e: any) => {
          e.preventDefault();
          setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
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

  const handleInstallClick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setDeferredPrompt(null);
      }
  };


  const handleEnhanceComplete = useCallback((enhancedPrompt: string) => {
    const cleanedPrompt = enhancedPrompt.replace(/^```(?:\w+\n)?([\s\S]*)\n```$/, '$1').trim();
    // Set initial prompt for App Builder
    setAppBuilderState(prev => ({ ...prev, messages: [{ id: `user-${Date.now()}`, role: 'user', text: cleanedPrompt }] }));
    setMode(AppMode.AppBuilder);
  }, []);
  
  const handleNavClick = (newMode: AppMode) => {
    setMode(newMode);
  };

  const navGroups = useMemo(() => [
    {
        title: "General",
        items: [
            { mode: AppMode.Chat, icon: ChatBubbleLeftRightIcon, label: "Chat" },
            { mode: AppMode.Enhancer, icon: WandIcon, label: "Prompt Enhancer" },
            { mode: AppMode.AppBuilder, icon: CubeTransparentIcon, label: "App Builder" },
        ]
    },
    {
        title: "Image Studio",
        items: [
            { mode: AppMode.ImageGenerator, icon: PhotoIcon, label: "Generator" },
            { mode: AppMode.ImageEditor, icon: PaintBrushIcon, label: "Editor" },
            { mode: AppMode.ImageAnalyst, icon: MagnifyingGlassCircleIcon, label: "Analyst" },
            { mode: AppMode.ImageAnimator, icon: FilmIcon, label: "Animator" },
        ]
    },
    {
        title: "Video Studio",
        items: [
            { mode: AppMode.VideoGenerator, icon: VideoCameraIcon, label: "Generator" },
            { mode: AppMode.VideoEditor, icon: ScissorsIcon, label: "Editor" },
            { mode: AppMode.VideoAnalyst, icon: VideoCameraSlashIcon, label: "Analyst" },
        ]
    },
    {
        title: "Audio Lab",
        items: [
            { mode: AppMode.VoiceChat, icon: MicrophoneIcon, label: "Voice Chat" },
            { mode: AppMode.TextToSpeech, icon: SpeakerWaveIcon, label: "Text to Speech" },
            { mode: AppMode.AudioTranscriber, icon: QueueListIcon, label: "Transcriber" },
        ]
    },
  ], []);

  // Helper to find the active item to display in header
  const activeNavItem = useMemo(() => {
      for (const group of navGroups) {
          const found = group.items.find(item => item.mode === mode);
          if (found) return found;
      }
      return null;
  }, [mode, navGroups]);

  const getSidebarLinkClass = (linkMode: AppMode) => {
    return `flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 py-3 lg:px-4 lg:py-2.5 font-medium rounded-md transition-all duration-200 w-full group relative ${
      mode === linkMode
        ? 'bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-lg border-l-4 border-emerald-500'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
    }`;
  };

  if (!API_KEY) {
    return <MissingApiKey />;
  }
  
  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-gray-800 flex relative isolate overflow-hidden">
        {errorMessage && <Toast message={errorMessage} onClose={clearError} />}
        <DynamicBackground />
        
        {/* Persistent Responsive Sidebar (Power Bar) */}
        <aside 
            className={`flex-shrink-0 bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out z-30 
            w-[5.5rem] ${isSidebarExpanded ? 'lg:w-64' : 'lg:w-20'}`}
        >
            <div className={`h-16 flex items-center border-b border-slate-800 shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-4' : 'justify-center'}`}>
                <div className={`flex items-center gap-3 ${isSidebarExpanded ? 'justify-start' : 'justify-center w-full'}`}>
                    <AIIcon className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                    <span className={`font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'block opacity-100 max-w-[150px]' : 'hidden opacity-0 max-w-0'} hidden lg:block`}>
                        Synapse
                    </span>
                </div>
                 {/* Desktop Toggle Button */}
                 <button 
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className="hidden lg:flex p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    {isSidebarExpanded ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                </button>
            </div>
            
            <nav className="flex-1 px-2 lg:px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {navGroups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                         {/* Category Header - Only show on expanded desktop, hide on mobile and collapsed desktop */}
                         <div className={`px-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider transition-all duration-300 hidden lg:block ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                            {group.title}
                         </div>
                         {/* Separator for collapsed mode */}
                         {!isSidebarExpanded && groupIndex > 0 && (
                             <div className="hidden lg:block h-px bg-slate-800 mx-2 my-3"></div>
                         )}
                         <div className="space-y-1">
                            {group.items.map((item) => (
                                <button
                                    key={item.mode}
                                    onClick={() => handleNavClick(item.mode)}
                                    className={getSidebarLinkClass(item.mode)}
                                    title={!isSidebarExpanded ? item.label : undefined}
                                >
                                    <item.icon className="h-6 w-6 flex-shrink-0 mb-0.5 lg:mb-0" />
                                    <span className={`text-[10px] lg:text-sm text-center lg:text-left leading-tight lg:leading-normal w-full lg:w-auto transition-all duration-300
                                        block lg:block
                                        ${isSidebarExpanded ? 'lg:opacity-100 lg:max-w-full' : 'lg:hidden lg:opacity-0 lg:max-w-0'}
                                    `}>
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                         </div>
                    </div>
                ))}
            </nav>
            
            <div className="p-2 lg:p-4 border-t border-slate-800 space-y-2 shrink-0 bg-slate-900">
                 {deferredPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        className="w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start text-emerald-400 hover:text-white transition-colors py-2 lg:px-3 bg-emerald-900/20 hover:bg-emerald-900/50 border border-emerald-900/30 rounded-md gap-1 lg:gap-2 group mb-2" 
                        title="Install App"
                    >
                        <DevicePhoneMobileIcon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className={`text-[10px] lg:text-sm font-semibold transition-all duration-300 ${isSidebarExpanded ? 'lg:inline-block' : 'lg:hidden'}`}>Install App</span>
                    </button>
                 )}

                 <div className={`hidden lg:block text-center text-sm text-slate-400 mb-2 truncate transition-all duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    User: <strong className="font-medium text-slate-300">{username}</strong>
                 </div>
                 <button onClick={handleLogout} className={`w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start text-slate-400 hover:text-white transition-colors py-2 lg:px-3 bg-slate-800/50 hover:bg-slate-800 rounded-md gap-1 lg:gap-2 group`} title="Logout">
                    <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0 group-hover:text-red-400 transition-colors" />
                    <span className={`text-[10px] lg:text-sm transition-all duration-300 ${isSidebarExpanded ? 'lg:inline-block' : 'lg:hidden'}`}>Logout</span>
                 </button>
            </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-y-auto w-full relative z-0">
             <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/75 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 transition-all shadow-sm">
                 <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-800 via-emerald-800 to-slate-800 bg-clip-text text-transparent truncate tracking-tight">
                        Synapse Generation
                    </h1>
                    {!isOnline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                           <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Offline
                        </span>
                    )}
                </div>
                
                {activeNavItem && (
                    <div className="flex items-center pl-4 shrink-0 animate-fade-in-down">
                        <div className="relative group cursor-default">
                             {/* Ambient Glow */}
                             <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-emerald-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-700"></div>
                             
                             {/* Badge Container */}
                             <div className="relative flex items-center gap-3 pr-6 pl-2 py-1.5 bg-white/80 backdrop-blur-2xl border border-white/60 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:shadow-[0_4px_12px_rgba(16,185,129,0.1)] transition-all duration-300">
                                
                                {/* Icon Box */}
                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-b from-white to-slate-50 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                                    <activeNavItem.icon className="h-5 w-5 text-emerald-600" />
                                </div>
                                
                                {/* Text Information */}
                                <div className="flex flex-col justify-center">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1 scale-95 origin-left">
                                        Active Module
                                    </span>
                                    <span className="text-sm font-bold text-slate-800 leading-none tracking-tight group-hover:text-emerald-700 transition-colors">
                                        {activeNavItem.label}
                                    </span>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
            </header>
            
            <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-[100vw] overflow-x-hidden">
                <div className="h-full">
                    <div className={mode === AppMode.Chat ? 'h-full' : 'hidden'}>
                        <Chat state={chatState} setState={setChatState} onReset={() => setChatState(initialChatState)} />
                    </div>
                    <div className={mode === AppMode.Enhancer ? 'h-full' : 'hidden'}>
                        <PromptEnhancer 
                            state={enhancerState} 
                            setState={setEnhancerState} 
                            onReset={() => setEnhancerState(initialEnhancerState)} 
                            onEnhanceComplete={handleEnhanceComplete}
                            savedPrompts={savedPrompts}
                            setSavedPrompts={setSavedPrompts}
                        />
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

            <footer className="py-4 text-center text-sm text-gray-400 shrink-0">
                <p>Powered by Google Gemini</p>
            </footer>
        </div>
    </div>
  );
};

export default App;
