
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role, ChatMode, User, AdRequest } from '../types';
import { sendMessageToGeminiStream, generateProjectTitle } from '../services/geminiService';
import AccessibilityManager from './AccessibilityManager';

interface WorkspaceProps {
  projectId?: string;
  initialPrompt: string;
  initialLanguage: string;
  initialFiles: FileList | null;
  initialChatMode: ChatMode;
  initialCode?: string;
  initialCreatorMessages?: ChatMessage[];
  initialQuestionMessages?: ChatMessage[];
  initialCodeHistory?: string[];
  
  modelId: string;
  onBack: () => void;
  onSaveProject: (id: string, code: string, creatorMessages: ChatMessage[], questionMessages: ChatMessage[], codeHistory: string[], name?: string) => void;
  user: User | null;
  approvedAds?: AdRequest[];
  onActivateAdSupportedPremium: () => void;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const Workspace: React.FC<WorkspaceProps> = ({ 
    projectId,
    initialPrompt, 
    initialLanguage, 
    initialFiles, 
    initialChatMode, 
    initialCode = '',
    initialCreatorMessages = [],
    initialQuestionMessages = [],
    initialCodeHistory = [],
    
    modelId, 
    onBack, 
    onSaveProject,
    user,
    approvedAds = [],
    onActivateAdSupportedPremium
}) => {
  // --- STATE ---
  const [creatorMessages, setCreatorMessages] = useState<ChatMessage[]>(initialCreatorMessages);
  const [questionMessages, setQuestionMessages] = useState<ChatMessage[]>(initialQuestionMessages);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  const [code, setCode] = useState(initialCode);
  const [codeHistory, setCodeHistory] = useState<string[]>(initialCodeHistory);
  const [historyIndex, setHistoryIndex] = useState(initialCodeHistory.length > 0 ? initialCodeHistory.length - 1 : -1);
  
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  
  // Rotating Ad Logic
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Construction Message Logic
  const [constructionMsg, setConstructionMsg] = useState("מכין את סביבת העבודה...");
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoNamedRef = useRef(false);

  // Constants
  const currentMessages = chatMode === ChatMode.CREATOR ? creatorMessages : questionMessages;
  const isPremiumUser = user?.isPremium && !user?.hasAdSupportedPremium; 
  const isFreeOrAdSupported = !isPremiumUser;

  // --- EFFECTS ---

  // 1. Init state
  useEffect(() => {
     setCreatorMessages(initialCreatorMessages || []);
     setQuestionMessages(initialQuestionMessages || []);
     setCode(initialCode || '');
     setCodeHistory(initialCodeHistory || []);
     setHistoryIndex(initialCodeHistory && initialCodeHistory.length > 0 ? initialCodeHistory.length - 1 : -1);
  }, [initialCreatorMessages, initialQuestionMessages, initialCode, initialCodeHistory]);

  // 2. Rotate Ads and Media
  useEffect(() => {
    let adInterval: ReturnType<typeof setInterval>;
    let mediaInterval: ReturnType<typeof setInterval>;

    // Rotate Ads every 15 seconds
    if (approvedAds.length > 0) {
        adInterval = setInterval(() => {
            setActiveAdIndex(prev => (prev + 1) % approvedAds.length);
            setActiveMediaIndex(0); // Reset media when ad changes
        }, 15000);
    }

    // Rotate Media within the current ad every 3 seconds
    mediaInterval = setInterval(() => {
        setActiveMediaIndex(prev => prev + 1);
    }, 3000);

    return () => {
        if (adInterval) clearInterval(adInterval);
        if (mediaInterval) clearInterval(mediaInterval);
    };
  }, [approvedAds.length]);

  // 3. Construction Messages Animation
  useEffect(() => {
    if (!isLoading) return;
    
    const steps = [
        "בונה את מבנה ה-HTML...",
        "מעצב עם CSS...",
        "כותב לוגיקה JavaScript...",
        "מבצע בדיקות תקינות...",
        "מסיים בנייה..."
    ];
    
    let stepIndex = 0;
    setConstructionMsg(steps[0]);
    
    const msgInterval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        setConstructionMsg(steps[stepIndex]);
    }, 3000);

    return () => clearInterval(msgInterval);
  }, [isLoading]);

  // 4. Auto-Name Project
  useEffect(() => {
    const triggerAutoName = async () => {
        if (code && projectId && !hasAutoNamedRef.current && initialPrompt.length > 25 && (!initialCode || initialCode.length === 0)) {
            hasAutoNamedRef.current = true;
            try {
                const newName = await generateProjectTitle(initialPrompt, code);
                if (newName && newName !== initialPrompt) {
                     onSaveProject(projectId, code, creatorMessages, questionMessages, codeHistory, newName);
                }
            } catch (e) {
                console.error("Auto naming failed", e);
            }
        }
    };
    triggerAutoName();
  }, [code, projectId, initialPrompt]);

  // 5. Auto-Save
  useEffect(() => {
      if (projectId) {
          setSaveStatus('unsaved');
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          
          saveTimeoutRef.current = setTimeout(() => {
              setSaveStatus('saving');
              onSaveProject(projectId, code, creatorMessages, questionMessages, codeHistory);
              setTimeout(() => setSaveStatus('saved'), 500);
          }, 2000);
      }
      return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [code, creatorMessages, questionMessages, codeHistory, projectId, onSaveProject]);

  // 6. Initial Chat Generation
  useEffect(() => {
    const initChat = async () => {
      if ((initialCreatorMessages && initialCreatorMessages.length > 0) || initialCode) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: Role.USER,
        text: `אני רוצה לבנות: ${initialPrompt}. שפה: ${initialLanguage}`,
        timestamp: Date.now(),
      };
      setCreatorMessages([userMsg]);
      
      if (initialChatMode === ChatMode.CREATOR) {
          setIsLoading(true);
          try {
            await handleStreamingResponse(userMsg.text, [], initialFiles, ChatMode.CREATOR, "");
          } catch (error) {
             console.error("Init Chat Error:", error);
          } finally {
            setIsLoading(false);
          }
      }
    };
    initChat();
  }, []);

  // 7. Scroll to bottom
  useEffect(() => {
    if (currentMessages.length > lastMsgCount.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        lastMsgCount.current = currentMessages.length;
    }
  }, [currentMessages.length, chatMode]);

  // --- LOGIC ---

  const pushNewVersion = (newCode: string) => {
    if (!newCode) return;
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const triggerRequest = async (promptText: string) => {
    if (isLoading) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: Role.USER,
      text: promptText,
      timestamp: Date.now(),
    };

    if (chatMode === ChatMode.CREATOR) {
        setCreatorMessages(prev => [...prev, userMsg]);
        pushNewVersion(code); 
    } else {
        setQuestionMessages(prev => [...prev, userMsg]);
    }

    setInput('');
    setIsLoading(true);
    
    abortControllerRef.current = new AbortController();

    const historyToUse = chatMode === ChatMode.CREATOR ? creatorMessages : questionMessages;
    try {
        await handleStreamingResponse(promptText, historyToUse, null, chatMode, code);
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
    }
  };

  const handleStreamingResponse = async (prompt: string, history: ChatMessage[], files: FileList | null, mode: ChatMode, currentCodeContext: string) => {
    let fullText = "";
    const botMsgId = (Date.now() + 1).toString();
    let isFirstChunk = true;

    const stream = sendMessageToGeminiStream(prompt, history, files, modelId, mode, currentCodeContext, abortControllerRef.current?.signal);

    for await (const chunk of stream) {
      fullText += chunk;
      
      if (isFirstChunk) {
          const newMsg = { id: botMsgId, role: Role.MODEL, text: fullText, timestamp: Date.now() };
          const updateFn = mode === ChatMode.CREATOR ? setCreatorMessages : setQuestionMessages;
          updateFn(prev => [...prev, newMsg]);
          isFirstChunk = false;
      } else {
          const updateFn = mode === ChatMode.CREATOR ? setCreatorMessages : setQuestionMessages;
          updateFn(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullText } : msg));
      }

      if (mode === ChatMode.CREATOR) {
          extractCode(fullText);
      }
    }
    
    // Final check
    if (mode === ChatMode.CREATOR) {
        extractCode(fullText, true);
    }
  };

  const extractCode = (text: string, force: boolean = false) => {
    if (!text) return;

    // 1. Look for DOCTYPE or HTML tag - The most reliable start
    const docTypeIndex = text.search(/<!DOCTYPE html/i);
    const htmlTagIndex = text.search(/<html/i);
    
    let startIndex = -1;
    
    if (docTypeIndex !== -1) {
        startIndex = docTypeIndex;
    } else if (htmlTagIndex !== -1) {
        startIndex = htmlTagIndex;
    }

    if (startIndex !== -1) {
        // We found the start of HTML. 
        // We take everything from here until the end, or until we hit a markdown closing fence.
        let extracted = text.substring(startIndex);
        
        // Try to remove trailing markdown block if present
        const endBlockIndex = extracted.lastIndexOf('```');
        if (endBlockIndex !== -1 && endBlockIndex > 10) { // arbitrary buffer
            extracted = extracted.substring(0, endBlockIndex);
        }
        
        setCode(extracted);
        return;
    }

    // 2. Fallback: Look for Markdown block start
    const mdBlockStart = text.match(/```html/i);
    if (mdBlockStart && mdBlockStart.index !== undefined) {
        let extracted = text.substring(mdBlockStart.index + mdBlockStart[0].length);
        const endBlockIndex = extracted.lastIndexOf('```');
        if (endBlockIndex !== -1) {
             extracted = extracted.substring(0, endBlockIndex);
        }
        setCode(extracted);
        return;
    }
    
    // 3. Last Resort (Streaming or Raw) - If we see standard tags
    if (text.includes('<head>') || text.includes('<body>') || text.includes('<style>')) {
        // Likely raw HTML being streamed without DOCTYPE yet
        // Try to clean up any preamble text
        const firstTag = text.indexOf('<');
        if (firstTag !== -1) {
             setCode(text.substring(firstTag));
        }
    }
  };

  const cleanMessage = (text: string) => {
    // This cleans the message bubble shown to the user in chat
    // We want to hide the massive code block
    return text.replace(/```html[\s\S]*?```/g, '*(קוד האתר)*').replace(/<!DOCTYPE html>[\s\S]*/i, '').trim();
  };

  const handleDownload = () => {
    const blob = new Blob([getCodeWithFooter(code)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    alert('הקוד הועתק ללוח!');
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([getCodeWithFooter(code)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  const handleSendMessage = () => {
      if (!input.trim()) return;
      triggerRequest(input);
  };

  // --- AD INJECTION ---
  const currentAd = approvedAds.length > 0 ? approvedAds[activeAdIndex] : null;
  // Get current media to display for this ad
  const currentAdMedia = currentAd && currentAd.mediaFiles && currentAd.mediaFiles.length > 0 
      ? currentAd.mediaFiles[activeMediaIndex % currentAd.mediaFiles.length] 
      : null;

  const getCodeWithFooter = (originalCode: string) => {
      if (!originalCode || originalCode.trim().length < 10) return originalCode;
      
      let modifiedCode = originalCode;
      
      // Inject Ad only for free users
      if (isFreeOrAdSupported && currentAd) {
          const adMediaHTML = currentAdMedia && currentAdMedia.type === 'image'
              ? `<img src="${currentAdMedia.data}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;" alt="Ad" />`
              : `<div style="width: 50px; height: 50px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">VIDEO</div>`;

          const amazonAdHTML = `
            <div id="aivan-sticky-ad" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid #e5e7eb;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                border-radius: 16px;
                padding: 12px;
                z-index: 2147483647;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                gap: 12px;
                max-width: 320px;
                animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                direction: rtl;
                transition: all 0.3s ease;
            ">
                <style>
                    @keyframes slideUp {
                        from { transform: translateY(100px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    #aivan-sticky-ad:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -5px rgba(0,0,0,0.15); }
                </style>
                ${adMediaHTML}
                <div style="flex: 1;">
                    <div style="font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
                       <span>בחסות</span>
                       <span style="color: #9ca3af; font-weight: normal;">${activeAdIndex + 1}/${approvedAds.length}</span>
                    </div>
                    <div style="font-size: 12px; font-weight: 800; color: #111827; margin-bottom: 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${currentAd.description}
                    </div>
                    ${currentAd.targetUrl ? `<a href="${currentAd.targetUrl}" target="_blank" rel="sponsored nofollow" style="color: #7c3aed; text-decoration: none; font-size: 11px; font-weight: 800; display: inline-flex; items-center: center; gap: 4px;">לפרטים נוספים <span style="font-size: 14px;">›</span></a>` : ''}
                </div>
                <button onclick="document.getElementById('aivan-sticky-ad').style.display='none'" style="position: absolute; top: -8px; left: -8px; border: none; background: #ef4444; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">&times;</button>
            </div>
          `;

          // Ensure we append safely - prefer before body end, else just append
          if (modifiedCode.includes('</body>')) {
              modifiedCode = modifiedCode.replace('</body>', `${amazonAdHTML}</body>`);
          } else {
              modifiedCode += amazonAdHTML;
          }
      }

      return modifiedCode;
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden fade-in-up text-gray-900 font-sans relative">
      
      {/* --- HEADER --- */}
      <div className="w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
           <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors border border-gray-200" title="חזור לדאשבורד">
                  <i className="fas fa-arrow-right"></i>
              </button>
              
              <div className="flex flex-col">
                  <span className="font-bold text-gray-800 text-sm">{projectId ? 'עורך האתר' : 'פרויקט חדש'}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : saveStatus === 'saving' ? 'bg-yellow-500' : 'bg-gray-300'}`}></span>
                    <span className="text-[10px] text-gray-400">{saveStatus === 'saved' ? 'נשמר' : saveStatus === 'saving' ? 'שומר...' : 'לא נשמר'}</span>
                  </div>
              </div>
           </div>

           {/* View Toggle */}
           <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
              <button onClick={() => setActiveView('preview')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'preview' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <i className="fas fa-eye mr-1"></i> תצוגה
              </button>
              <button onClick={() => setActiveView('code')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'code' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <i className="fas fa-code mr-1"></i> קוד
              </button>
           </div>
           
           <div className="flex items-center gap-2">
              <AccessibilityManager positionClass="relative" buttonClass="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600" />
              <button onClick={handleOpenInNewTab} className="hidden md:flex px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors gap-2 items-center">
                  <i className="fas fa-external-link-alt"></i> חלון חדש
              </button>
           </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 pt-16 w-full h-full relative">
         
         {/* LEFT PANEL: WORKSPACE (PREVIEW / CODE) */}
         <div className="flex-1 relative bg-gray-100/50 flex flex-col items-center justify-center overflow-hidden">
            
            {/* DEVICE TOGGLE BAR (Only visible in Preview) */}
            {activeView === 'preview' && (
                <div className="absolute top-4 z-40 bg-white/80 backdrop-blur shadow-sm border border-gray-200 rounded-full p-1 flex gap-1 transform transition-transform hover:scale-105">
                    <button 
                        onClick={() => setPreviewDevice('desktop')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${previewDevice === 'desktop' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="מחשב"
                    >
                        <i className="fas fa-desktop"></i>
                    </button>
                    <button 
                        onClick={() => setPreviewDevice('tablet')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${previewDevice === 'tablet' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="טאבלט"
                    >
                        <i className="fas fa-tablet-alt"></i>
                    </button>
                    <button 
                        onClick={() => setPreviewDevice('mobile')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${previewDevice === 'mobile' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="מובייל"
                    >
                        <i className="fas fa-mobile-alt"></i>
                    </button>
                </div>
            )}

            {/* PREVIEW CONTAINER */}
            {activeView === 'preview' && (
                <div className={`transition-all duration-500 ease-in-out relative shadow-2xl bg-white border-8 border-gray-800 rounded-3xl overflow-hidden mt-8 mb-4 flex items-center justify-center
                    ${previewDevice === 'desktop' ? 'w-[95%] h-[85%] rounded-md border-4' : ''}
                    ${previewDevice === 'tablet' ? 'w-[768px] h-[80%] rounded-[2rem]' : ''}
                    ${previewDevice === 'mobile' ? 'w-[375px] h-[80%] rounded-[3rem]' : ''}
                `}>
                    
                    {/* Minimal Loading Indicator (Bottom Left) - NON BLOCKING */}
                    {isLoading && (
                         <div className="absolute bottom-4 left-4 z-50 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg pointer-events-none">
                             <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                             {constructionMsg}
                         </div>
                    )}

                    {!code ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                <i className="fas fa-paint-brush text-3xl text-gray-400"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-400">הקנבס ריק...</h3>
                            <p className="text-gray-400 mt-2">האתר יופיע כאן ברגע שהבוט יתחיל לכתוב</p>
                        </div>
                    ) : (
                        <iframe 
                            title="Live Preview" 
                            srcDoc={getCodeWithFooter(code)} 
                            className="w-full h-full bg-white"
                            sandbox="allow-scripts allow-modals allow-forms allow-same-origin" 
                        />
                    )}
                </div>
            )}

            {/* CODE EDITOR CONTAINER */}
            {activeView === 'code' && (
                <div className="w-full h-full p-4 relative">
                    <div className="absolute top-6 right-8 flex gap-2 z-10">
                        <button 
                            onClick={handleCopy} 
                            disabled={isLoading}
                            className={`bg-white/90 backdrop-blur border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                            <i className="fas fa-copy mr-1"></i> העתק
                        </button>
                        <button 
                            onClick={handleDownload} 
                            disabled={isLoading}
                            className={`bg-white/90 backdrop-blur border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                            <i className="fas fa-download mr-1"></i> הורד
                        </button>
                    </div>
                    <textarea 
                        value={code} 
                        onChange={(e) => { setCode(e.target.value); }}
                        readOnly={isLoading}
                        className={`w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-6 rounded-xl shadow-inner resize-none focus:outline-none leading-relaxed ${isLoading ? 'cursor-not-allowed opacity-90' : ''}`}
                        spellCheck={false}
                    />
                </div>
            )}

         </div>

         {/* RIGHT PANEL: CHAT */}
         <div className="w-[350px] md:w-[400px] bg-white border-r border-gray-200 flex flex-col h-full shadow-xl z-20">
             
             {/* Chat Tabs */}
             <div className="p-4 border-b border-gray-100 flex justify-center">
                 <div className="bg-gray-100 p-1 rounded-xl flex w-full">
                     <button 
                        onClick={() => setChatMode(ChatMode.CREATOR)} 
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${chatMode === ChatMode.CREATOR ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                     >
                         <i className="fas fa-magic"></i> יוצר (Builder)
                     </button>
                     <button 
                        onClick={() => setChatMode(ChatMode.QUESTION)} 
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${chatMode === ChatMode.QUESTION ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                     >
                         <i className="fas fa-comment-dots"></i> צ'אט (Chat)
                     </button>
                 </div>
             </div>

             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
                 {currentMessages.map((msg, idx) => {
                     const isUser = msg.role === Role.USER;
                     const text = cleanMessage(msg.text);
                     if (!text) return null;

                     return (
                         <div key={msg.id || idx} className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}>
                             <div className={`flex flex-col max-w-[90%] ${isUser ? 'items-start' : 'items-end'}`}>
                                 <span className="text-[10px] text-gray-400 mb-1 px-1">{isUser ? 'אתה' : 'Aivan'}</span>
                                 <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                     isUser 
                                        ? 'bg-gray-900 text-white rounded-tl-none' 
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-tr-none'
                                 }`}>
                                     {text}
                                 </div>
                             </div>
                         </div>
                     );
                 })}
                 
                 {isLoading && (
                     <div className="flex justify-end w-full">
                         <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tr-none shadow-sm flex items-center gap-3">
                             <div className="flex gap-1">
                                 <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                 <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                 <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                             </div>
                             <span className="text-xs text-gray-500 font-medium">בונה את האתר...</span>
                         </div>
                     </div>
                 )}
                 <div ref={messagesEndRef} />
             </div>

             {/* Input Area */}
             <div className="p-4 bg-white border-t border-gray-100">
                 <div className="relative flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all">
                     <textarea 
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         onKeyDown={handleKeyDown}
                         placeholder={chatMode === ChatMode.CREATOR ? "תאר שינויים או תוספות לאתר..." : "שאל שאלה על הקוד..."}
                         className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 px-2 text-sm text-gray-800 scrollbar-hide"
                         rows={1}
                     />
                     
                     {isLoading ? (
                         <button onClick={() => abortControllerRef.current?.abort()} className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors mb-0.5">
                             <i className="fas fa-stop"></i>
                         </button>
                     ) : (
                         <button onClick={handleSendMessage} disabled={!input.trim()} className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                             <i className="fas fa-paper-plane"></i>
                         </button>
                     )}
                 </div>
             </div>

         </div>

      </div>
    </div>
  );
};

export default Workspace;
