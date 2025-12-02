
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role, ChatMode, User, AdRequest } from '../types';
import { sendMessageToGeminiStream } from '../services/geminiService';
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
  onSaveProject: (id: string, code: string, creatorMessages: ChatMessage[], questionMessages: ChatMessage[], codeHistory: string[]) => void;
  user: User | null;
  approvedAds?: AdRequest[];
  onActivateAdSupportedPremium: () => void;
}

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
  const [creatorMessages, setCreatorMessages] = useState<ChatMessage[]>(initialCreatorMessages);
  const [questionMessages, setQuestionMessages] = useState<ChatMessage[]>(initialQuestionMessages);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [code, setCode] = useState(initialCode);
  const [codeHistory, setCodeHistory] = useState<string[]>(initialCodeHistory);
  const [historyIndex, setHistoryIndex] = useState(initialCodeHistory.length > 0 ? initialCodeHistory.length - 1 : -1);
  const [isEditing, setIsEditing] = useState(false);
  
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  
  // Current Ad for display
  const [currentAd, setCurrentAd] = useState<AdRequest | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWebLanguage = initialLanguage === 'HTML/CSS/JS' || initialLanguage === 'React';
  const currentMessages = chatMode === ChatMode.CREATOR ? creatorMessages : questionMessages;

  const isPremiumUser = user?.isPremium && !user?.hasAdSupportedPremium; 
  const isFreeOrAdSupported = !isPremiumUser;

  // Auto-Save Logic (Debounced)
  useEffect(() => {
      if (projectId) {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
              onSaveProject(projectId, code, creatorMessages, questionMessages, codeHistory);
          }, 2000); // Save after 2 seconds of inactivity
      }
  }, [code, creatorMessages, questionMessages, codeHistory, projectId, onSaveProject]);

  const pushNewVersion = (newCode: string) => {
    if (!newCode) return;
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
       const newIndex = historyIndex - 1;
       setHistoryIndex(newIndex);
       setCode(codeHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < codeHistory.length - 1) {
       const newIndex = historyIndex + 1;
       setHistoryIndex(newIndex);
       setCode(codeHistory[newIndex]);
    }
  };

  // Pick random ad logic
  useEffect(() => {
      // Logic for picking ads remains...
      if ((isLoading || !code) && approvedAds.length > 0 && isFreeOrAdSupported) {
          const randomIndex = Math.floor(Math.random() * approvedAds.length);
          setCurrentAd(approvedAds[randomIndex]);
      } else {
          // Keep showing if no code, otherwise hide
          if (code) setCurrentAd(null);
          else if (approvedAds.length > 0 && isFreeOrAdSupported) {
               setCurrentAd(approvedAds[Math.floor(Math.random() * approvedAds.length)]);
          }
      }
  }, [isLoading, approvedAds, isFreeOrAdSupported, code]);

  useEffect(() => {
    const initChat = async () => {
      // IF WE ALREADY HAVE MESSAGES OR CODE, DO NOT REGENERATE
      if (initialCreatorMessages.length > 0 || initialCode) {
          return; 
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (currentMessages.length > lastMsgCount.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        lastMsgCount.current = currentMessages.length;
    }
  }, [currentMessages.length, chatMode]);

  const handleQuickAction = (type: 'BUGS' | 'SECURITY' | 'DEPLOY') => {
      if (type === 'DEPLOY' && !user?.isPremium) {
          alert("פרסום האתר לשרתים זמין למנויי פרימיום בלבד!");
          return;
      }
      let prompt = "";
      switch(type) {
          case 'BUGS': prompt = "אנא סרוק את הקוד ומצא שגיאות."; break;
          case 'SECURITY': prompt = "אנא הוסף שכבות אבטחה."; break;
          case 'DEPLOY': prompt = "אנא הכן את הקוד לפרסום."; break;
      }
      triggerRequest(prompt);
  };

  const handleEditToggle = () => {
      if (!user?.isPremium) {
          alert("עריכת קוד ידנית זמינה למנויי פרימיום בלבד! שדרג עכשיו כדי לפתוח אפשרות זו.");
          return;
      }
      setIsEditing(!isEditing);
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

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = () => {
      if (!input.trim()) return;
      triggerRequest(input);
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
  };

  const SEPARATOR = "___AIVAN_CODE_START___";

  const extractCode = (text: string) => {
    const parts = text.split(SEPARATOR);
    if (parts.length < 2) {
         const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
         let match;
         let foundCode = '';
         while ((match = codeBlockRegex.exec(text)) !== null) foundCode += match[1] + '\n\n';
         if (foundCode.trim()) setCode(foundCode);
         return;
    }
    
    const codePart = parts[1];
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    let match;
    let foundCode = '';
    while ((match = codeBlockRegex.exec(codePart)) !== null) foundCode += match[1] + '\n\n';
    
    const openBlockMatch = codePart.match(/```(?:\w+)?\n([\s\S]*?)$/);
    if (openBlockMatch && !codePart.endsWith('```')) foundCode += openBlockMatch[1];

    if (foundCode.trim()) setCode(foundCode);
  };

  const cleanMessage = (text: string) => {
    if (!text) return '';
    return text.split(SEPARATOR)[0].trim();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  const getCodeWithFooter = (originalCode: string) => {
      if (!originalCode) return "";
      
      let footerHTML = `<footer style="width: 100%; padding: 20px; text-align: center; background: #f8f9fa; color: #6c757d; font-family: sans-serif; font-size: 12px; border-top: 1px solid #e9ecef; margin-top: auto;">`;
      footerHTML += `נבנה בעזרת בינה מלאכותית ע"י <strong style="color: #9333ea;">AIVAN</strong>`;
      
      if (isFreeOrAdSupported) {
          footerHTML += `<br/><br/><span style="font-size: 10px; color: #999;">Aivan participates in the Amazon Services LLC Associates Program. As an Amazon Associate, we earn from qualifying purchases.</span>`;
          footerHTML += `</footer>`;

          // Placeholder Amazon Ad
          const adHTML = `
            <div id="aivan-amazon-ad" style="width: 100%; background: #fff; border-top: 2px solid #ff9900; padding: 15px; text-align: center; font-family: sans-serif; box-shadow: 0 -4px 10px rgba(0,0,0,0.05); margin-top: 20px;">
                <div style="max-width: 728px; height: 90px; background: #f3f3f3; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; color: #666;">
                    <span style="font-weight: bold; color: #ff9900;">Amazon</span>&nbsp;Ad Space Reserved (728x90)
                </div>
            </div>
          `;
          
          let modifiedCode = originalCode;
          modifiedCode = modifiedCode.includes('</body>') 
              ? modifiedCode.replace('</body>', `${adHTML}${footerHTML}</body>`) 
              : modifiedCode + adHTML + footerHTML;
          return modifiedCode;
      } else {
          footerHTML += `</footer>`;
          return originalCode.includes('</body>') 
              ? originalCode.replace('</body>', `${footerHTML}</body>`) 
              : originalCode + footerHTML;
      }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden fade-in-up text-gray-900 font-sans relative">
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 relative flex-shrink-0 z-20">
             <div className="flex items-center gap-2 z-10">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors shadow-sm border border-gray-200"><i className="fas fa-arrow-right text-lg"></i></button>
                <AccessibilityManager positionClass="relative" buttonClass="bg-gray-50 hover:bg-gray-100 text-gray-600 shadow-sm border border-gray-200" />
             </div>
             <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-100 p-1 rounded-full flex items-center shadow-inner w-[200px] z-0">
                <button onClick={() => setActiveView('preview')} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all ${activeView === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><i className="fas fa-desktop mr-2"></i>תצוגה</button>
                <button onClick={() => setActiveView('code')} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all ${activeView === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><i className="fas fa-code mr-2"></i>קוד</button>
             </div>
             <div className="w-20"></div>
         </header>

         <div className="flex-1 relative bg-gray-50 overflow-hidden">
            <div className={`absolute inset-0 w-full h-full ${activeView === 'preview' ? 'block' : 'hidden'}`}>
                {(!code || (isLoading && !code)) ? (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100">
                         <div className="border-4 border-dashed border-gray-400/30 w-[90%] h-[90%] rounded-3xl relative overflow-hidden bg-white shadow-xl flex flex-col items-center justify-center">
                             {isFreeOrAdSupported && currentAd ? (
                                <div className="flex flex-col h-full w-full">
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-white to-gray-50">
                                         <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded mb-6 tracking-widest uppercase">פרסומת</span>
                                         <h2 className="text-3xl font-black text-gray-900 mb-6 leading-tight max-w-2xl">{currentAd.description}</h2>
                                         
                                         {currentAd.mediaName && (
                                            <div className="mb-8 w-full max-w-md h-48 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                                                <i className="fas fa-image text-4xl"></i>
                                            </div>
                                         )}

                                         {currentAd.targetUrl && (
                                             <a 
                                                href={currentAd.targetUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                                             >
                                                 לפרטים נוספים <i className="fas fa-arrow-left"></i>
                                             </a>
                                         )}
                                    </div>
                                    <div className="h-12 bg-white border-t border-gray-100 flex items-center justify-center text-xs text-gray-400">
                                        בחסות Aivan Ads
                                    </div>
                                </div>
                             ) : isFreeOrAdSupported ? (
                                <div className="text-center">
                                    <h2 className="text-4xl font-black text-gray-300 uppercase tracking-widest text-center">שטח פרסום<br/>שמור</h2>
                                    <p className="text-xs text-gray-400 mt-2">הצטרף לפרימיום להסרת פרסומות</p>
                                </div>
                             ) : (
                                <div className="text-center text-gray-400">
                                    <i className="fas fa-magic text-4xl mb-4 text-purple-200"></i>
                                    <p className="font-bold text-gray-300">Aivan Premium - No Ads</p>
                                </div>
                             )}
                             
                             {isLoading && (
                               <div className="absolute bottom-20 flex flex-col items-center z-20 bg-white/80 backdrop-blur px-6 py-4 rounded-2xl shadow-sm border border-white">
                                   <div className="loader w-8 h-8 border-3 border-purple-200 border-top-purple-600 mb-2"></div>
                                   <p className="text-xs font-bold text-gray-600">בונה את האתר...</p>
                               </div>
                             )}
                         </div>
                    </div>
                ) : !isWebLanguage ? (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-100">
                         <div className="text-center">
                             <i className="fas fa-eye-slash text-4xl text-gray-400 mb-4"></i>
                             <h2 className="text-2xl font-bold text-gray-600">תצוגה מקדימה לא זמינה</h2>
                             <p className="text-gray-400 mt-2">השפה שנבחרה אינה תומכת בתצוגה מקדימה בדפדפן.</p>
                         </div>
                    </div>
                ) : (
                    <iframe title="Preview" srcDoc={getCodeWithFooter(code)} className="w-full h-full border-none bg-white" sandbox="allow-scripts allow-modals allow-forms allow-same-origin" />
                )}
            </div>

            <div className={`absolute inset-0 w-full h-full bg-white flex flex-col ${activeView === 'code' ? 'flex' : 'hidden'}`}>
                {!isLoading && (
                  <div className="h-16 bg-gray-50 border-b border-gray-200 flex items-center px-4 flex-shrink-0 relative overflow-x-auto no-scrollbar slide-in-right">
                      <div className="mx-auto bg-white border border-gray-300 rounded-full flex items-center p-1.5 shadow-sm gap-1 whitespace-nowrap min-w-max">
                          {codeHistory.length > 1 && (
                            <>
                              <div className="flex items-center gap-1">
                                  <button onClick={handleUndo} disabled={historyIndex <= 0} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><i className="fas fa-arrow-right"></i></button>
                                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 cursor-default">גרסה {historyIndex + 1}</span>
                                  <button onClick={handleRedo} disabled={historyIndex >= codeHistory.length - 1} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><i className="fas fa-arrow-left"></i></button>
                              </div>
                              <div className="w-px h-5 bg-gray-300 mx-2"></div>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                              <button onClick={() => handleQuickAction('BUGS')} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-red-50 text-red-600"><i className="fas fa-bug"></i> תיקון</button>
                              <button onClick={() => handleQuickAction('SECURITY')} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-50 text-blue-600"><i className="fas fa-shield-alt"></i> אבטחה</button>
                              <button 
                                onClick={() => handleQuickAction('DEPLOY')} 
                                className={`px-3 py-1.5 rounded-full text-xs font-medium ${isPremiumUser ? 'hover:bg-green-50 text-green-600' : 'opacity-50 cursor-not-allowed text-gray-400'}`}
                              >
                                  <i className="fas fa-cloud-upload-alt"></i> פרסום { !isPremiumUser && <i className="fas fa-lock ml-1 text-[10px]"></i> }
                              </button>
                          </div>
                          <div className="w-px h-5 bg-gray-300 mx-2"></div>
                          <div className="flex items-center gap-1">
                              <button 
                                onClick={handleEditToggle} 
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                    isEditing ? 'bg-purple-600 text-white' : 
                                    (isPremiumUser ? 'hover:bg-gray-100 text-gray-700' : 'opacity-50 text-gray-400')
                                }`}
                              >
                                  <i className={`fas ${isEditing ? 'fa-save' : 'fa-edit'}`}></i> {isEditing ? 'שמור' : 'ערוך'}
                                  {!isPremiumUser && <i className="fas fa-lock text-[10px]"></i>}
                              </button>
                              
                              <button onClick={handleCopy} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-600"><i className="fas fa-copy"></i></button>
                              <button onClick={handleDownload} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-600"><i className="fas fa-download"></i></button>
                          </div>
                      </div>
                  </div>
                )}
                <div className="flex-1 overflow-auto p-4" dir="ltr">
                   {isEditing ? (
                       <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-full font-mono text-sm p-4 outline-none resize-none bg-gray-50 rounded-xl border" />
                   ) : (
                       <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap">{code}</pre>
                   )}
                </div>
            </div>
         </div>
      </div>

      <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col h-full flex-shrink-0 z-30 shadow-xl">
         <header className="h-16 flex items-center justify-center border-b border-gray-100 relative">
             <div className="flex flex-col items-center">
                 <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">AIVAN</span>
                 <div className="bg-gray-100 p-1 rounded-full flex items-center gap-1">
                     <button onClick={() => setChatMode(ChatMode.CREATOR)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${chatMode === ChatMode.CREATOR ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>סוכן</button>
                     <div className="w-px h-3 bg-gray-300"></div>
                     <button onClick={() => setChatMode(ChatMode.QUESTION)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${chatMode === ChatMode.QUESTION ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>שאלה</button>
                 </div>
             </div>
         </header>

         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {currentMessages.map((msg, idx) => {
               const displayText = cleanMessage(msg.text);
               const isEmpty = !displayText.trim();

               return (
                  <div key={msg.id || idx} className={`flex ${msg.role === Role.USER ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed ${
                        msg.role === Role.USER 
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                    }`}>
                       {isEmpty && msg.role === Role.MODEL ? (
                           <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                               <i className="fas fa-check-circle"></i> הקוד עודכן בהצלחה
                           </div>
                       ) : (
                           displayText
                       )}
                    </div>
                  </div>
               );
            })}
            
            {isLoading && (
               <div className="flex justify-end">
                  <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-400 flex items-center gap-2 shadow-sm">
                      <div className="loader w-4 h-4 border-2 border-gray-300 border-top-purple-600"></div>
                      <span>אייבן חושב...</span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
         </div>

         <div className="p-4 bg-white border-t border-gray-100">
             <div className="relative">
                 <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={chatMode === ChatMode.CREATOR ? "תאר מה להוסיף או לשנות באתר..." : "שאל אותי שאלה על הקוד..."}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 resize-none h-14 text-sm scrollbar-hide"
                    disabled={isLoading}
                 />
                 <div className="absolute left-2 top-2">
                     {isLoading ? (
                         <button onClick={handleStopGeneration} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                             <i className="fas fa-stop"></i>
                         </button>
                     ) : (
                         <button onClick={handleSendMessage} disabled={!input.trim()} className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50">
                             <i className="fas fa-arrow-up"></i>
                         </button>
                     )}
                 </div>
             </div>
             <p className="text-[10px] text-center text-gray-400 mt-2">
                 {chatMode === ChatMode.CREATOR ? "Aivan Agent יעדכן את הקוד בזמן אמת." : "Aivan Consultant יענה לשאלותיך."}
             </p>
         </div>
      </div>
    </div>
  );
};

export default Workspace;
