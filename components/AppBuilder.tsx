import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { Message } from '../types';
import { useError } from '../hooks/useError';
import { PaperAirplaneIcon, ClipboardIcon, CheckIcon, UserIcon, SparklesIcon, CodeBracketIcon, TrashIcon } from './icons';

interface AppBuilderProps {
  state: {
      messages: Message[],
      prompt: string,
      generatedCode: string,
      enableThinking: boolean,
  };
  setState: React.Dispatch<React.SetStateAction<AppBuilderProps['state']>>;
  onReset: () => void;
}

const SYSTEM_INSTRUCTION = `You are an expert AI software architect and developer named "Synapse Builder", with deep expertise in modern UI/UX design. You are collaborating with a user to build a complete, single-file web application in real-time. Your primary role is to write and modify code to create beautiful, functional, and responsive applications.

**Core Tasks & Rules:**
1.  **Code Generation:** Based on user prompts, generate or modify a single-file web application using HTML, Tailwind CSS (via CDN), and vanilla JavaScript.
2.  **Full Code Required:** On every request that requires a code change, you MUST provide the complete, updated file. Do not provide snippets or diffs.
3.  **Code Formatting:** Your response for code generation MUST ONLY contain the code inside a single Markdown code block: \`\`\`html ... \`\`\`.
4.  **Assistance:** If the user asks a question, wants an explanation, or asks for suggestions, answer them clearly. Do not generate a code block in this case unless asked.
5.  **Asset Integration:** The user will provide assets (images, videos, audio) or generated text (summaries, transcriptions). Your task is to incorporate these assets/text into the code as instructed. The user will provide the necessary data (like base64 strings or text content).
6.  **Live API:** If asked to build an app using the microphone for real-time conversation, generate the necessary HTML and JavaScript scaffolding for a client-side application that uses the Gemini Live API. Do not try to implement the Live API yourself.

**Advanced UI/UX Capabilities:**
You are a master of creating professional, premium-themed user interfaces. You can implement a wide variety of UI components and layouts. When a user requests them, you should be able to build:

*   **Main Layout Sections:**
    *   **Headers & App Bars:** With titles, navigation, and action buttons.
    *   **Footers:** Containing links, copyright information, etc.
    *   **Sidebars/Navigation Drawers:** For primary navigation, collapsible on smaller screens.
    *   **Bottom Navigation Bars:** Ideal for mobile-first designs.
    *   **Main Content Areas:** The primary workspace for the application.

*   **Interactive UI Components:**
    *   **Buttons:** Styled buttons with icons, different states (hover, active, disabled).
    *   **Icons:** Use Heroicons or other SVG icons for visual clarity.
    *   **Input/Text Fields:** Well-designed forms with labels, placeholders, and validation states.
    *   **Menus:** Hamburger menus, Kebab/Meatball menus for additional options, and Dropdown lists for selections.
    *   **Selection Controls:** Checkboxes, Radio Buttons, and Toggles/Switches.
    *   **Cards:** To display content in a structured and visually appealing way.

*   **Overlays & Feedback:**
    *   **Modals & Dialog Boxes:** For focused tasks or important messages.
    *   **Progress Bars/Loaders:** To indicate loading states.
    *   **Notifications, Snackbars, Toasts:** For providing brief, non-intrusive feedback to the user.

*   **Theming & Styling:**
    *   You can create **professional, advanced, and premium themes** using Tailwind CSS.
    *   This includes defining a consistent color palette (primary, secondary, accent colors), typography (font sizes, weights), spacing, and component styles to match a user's request (e.g., "dark mode theme", "minimalist theme", "corporate theme").

Your goal is to translate user requirements into a fully working, aesthetically pleasing, and user-friendly web application, all within a single HTML file.
`;


const BlinkingCursor = () => <span className="inline-block w-2.5 h-5 bg-emerald-500 animate-pulse ml-1 rounded-sm"></span>;

const AppBuilder: React.FC<AppBuilderProps> = ({ state, setState, onReset }) => {
  const { messages, prompt, generatedCode, enableThinking } = state;
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useError();
  const [isCopied, setIsCopied] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'code' | 'preview'>('chat');

  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key is missing");
      const ai = new GoogleGenAI({ apiKey });
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-2.5-pro',
        config: { 
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });
      // If there's an initial message from prompt enhancer, send it
      if (messages.length === 1 && messages[0].role === 'user') {
        handleSend(messages[0].text);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(`Failed to initialize AI model: ${err.message}`);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      (window as any).Prism?.highlightAll();
    }
  }, [generatedCode, isLoading]);

  const handleSend = async (promptToSend?: string) => {
    const currentPrompt = promptToSend || prompt;
    if (!currentPrompt.trim()) return;

    setIsLoading(true);
    
    // Don't add user message if it was the initial one from enhancer
    if (!promptToSend) {
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: currentPrompt };
        setState(prev => ({...prev, messages: [...prev.messages, userMessage]}));
    }
    
    setState(prev => ({...prev, prompt: ''}));

    const modelMessageId = `model-${Date.now()}`;
    setTimeout(() => setState(prev => ({...prev, messages: [...prev.messages, { id: modelMessageId, role: 'model', text: '' }]})), 100);

    try {
        if (!chatSessionRef.current) throw new Error("Chat session not initialized");
        const stream = await chatSessionRef.current.sendMessageStream({ 
          message: currentPrompt,
          config: {
            ...(enableThinking && { thinkingConfig: { thinkingBudget: 32768 } })
          }
        });

        let fullResponse = '';
        const codeRegex = /```html\n([\s\S]*?)\n```/;

        for await (const chunk of stream) {
          fullResponse += chunk.text;
          const match = fullResponse.match(codeRegex);
          if (match && match[1]) {
            setState(prev => ({ ...prev, generatedCode: match[1] }));
            setState(prev => ({ ...prev, messages: prev.messages.map(msg => msg.id === modelMessageId ? { ...msg, text: "I'm updating the code..." } : msg) }));
          } else {
            setState(prev => ({ ...prev, messages: prev.messages.map(msg => msg.id === modelMessageId ? { ...msg, text: fullResponse } : msg) }));
          }
        }

        const finalMatch = fullResponse.match(codeRegex);
        if (finalMatch && finalMatch[1]) {
          setState(prev => ({ ...prev, generatedCode: finalMatch[1].trim() }));
          setState(prev => ({ ...prev, messages: prev.messages.map(msg => msg.id === modelMessageId ? { ...msg, text: "Done! I've updated the application code." } : msg) }));
        } else {
           setState(prev => ({ ...prev, messages: prev.messages.map(msg => msg.id === modelMessageId ? { ...msg, text: fullResponse } : msg) }));
        }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(`An error occurred: ${err.message}`);
      setState(prev => ({...prev, messages: prev.messages.filter(msg => msg.id !== modelMessageId)}));
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

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderPanel = (panel: 'chat' | 'code' | 'preview') => {
    switch (panel) {
        case 'chat': return (
            <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200/75 flex justify-end items-center">
                    <button onClick={onReset} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors font-medium">
                        <TrashIcon className="h-4 w-4" />
                        Reset Builder
                    </button>
                </div>
                <div ref={messagesEndRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
                     {messages.map((message, index) => (
                        <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'model' && ( <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-white" /></div> )}
                            <div className={`max-w-md p-3 rounded-lg ${message.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
                                {message.content && <div className="mt-2">{message.content}</div>}
                                {isLoading && index === messages.length - 1 && !message.content && <BlinkingCursor />}
                            </div>
                            {message.role === 'user' && ( <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-white" /></div> )}
                        </div>
                    ))}
                </div>
                <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-xl">
                    <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center">
                            <input type="checkbox" id="enableThinking" checked={enableThinking} onChange={e => setState(prev => ({...prev, enableThinking: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"/>
                            <label htmlFor="enableThinking" className="ml-2 block text-sm text-gray-700">Deeper Thinking</label>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <textarea value={prompt} onChange={(e) => setState(prev => ({...prev, prompt: e.target.value}))} onKeyDown={handleKeyDown} placeholder="Describe the changes you want to make..." className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200 resize-none" disabled={isLoading} rows={2}/>
                        <button onClick={() => handleSend()} disabled={isLoading || !prompt.trim()} className="bg-emerald-600 text-white p-2.5 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0 self-stretch" aria-label="Send message"><PaperAirplaneIcon className="h-5 h-5" /></button>
                    </div>
                </div>
            </div>
        );
        case 'code': return (
            <div className="flex flex-col h-full bg-slate-800 border border-slate-700 rounded-xl shadow-sm text-white">
                <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-2"><CodeBracketIcon className="h-5 w-5 text-slate-400" /><span className="font-mono text-sm">index.html</span></div>
                    <button onClick={handleCopy} className="text-sm flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-md transition-colors">{isCopied ? <CheckIcon className="h-4 w-4 text-emerald-400" /> : <ClipboardIcon className="h-4 w-4" />} {isCopied ? 'Copied!' : 'Copy'}</button>
                </div>
                <div className="flex-grow overflow-auto p-4"><pre className="!bg-transparent !p-0 h-full"><code className="language-html font-mono text-sm">{generatedCode}</code></pre></div>
            </div>
        );
        case 'preview': return (
             <div className="flex flex-col h-full bg-white border border-slate-200/75 rounded-xl shadow-sm">
                <div className="p-3 border-b border-slate-200 flex-shrink-0"><h3 className="text-sm font-semibold text-slate-700">Live Preview</h3></div>
                 <div className="flex-grow bg-white rounded-b-xl"><iframe srcDoc={generatedCode} title="Live Preview" className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" /></div>
            </div>
        );
    }
  }

  return (
    <div className="h-full">
        <div className="hidden lg:grid grid-cols-3 gap-6 h-full">
            <div className="col-span-1 h-full">{renderPanel('chat')}</div>
            <div className="col-span-1 h-full">{renderPanel('code')}</div>
            <div className="col-span-1 h-full">{renderPanel('preview')}</div>
        </div>
        <div className="lg:hidden flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-slate-200">
                <div className="flex justify-around">
                    {(['chat', 'code', 'preview'] as const).map(tab => ( <button key={tab} onClick={() => setActiveMobileTab(tab)} className={`w-full py-3 text-sm font-medium capitalize ${activeMobileTab === tab ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>{tab}</button>))}
                </div>
            </div>
            <div className="flex-grow p-2 overflow-y-auto">{renderPanel(activeMobileTab)}</div>
        </div>
    </div>
  );
};

export default AppBuilder;