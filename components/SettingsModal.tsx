
import React, { useState, useRef, useEffect } from 'react';
import { User, SettingsTab, Role, Theme } from '../types';
import { ai } from '../services/geminiService';

interface SettingsModalProps {
  user: User | null;
  initialTab?: SettingsTab;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  history?: string[];
  onClearHistory?: () => void;
  onDeleteHistoryItem?: (index: number) => void;
  onRenameHistoryItem?: (index: number, newName: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, 
  initialTab = SettingsTab.ACCOUNT, 
  onClose, 
  onLogout, 
  onUpdateUser,
  history = [],
  onClearHistory,
  onDeleteHistoryItem,
  onRenameHistoryItem
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [name, setName] = useState(user?.name || '');
  
  // History preferences
  const [saveHistory, setSaveHistory] = useState(user?.preferences?.saveHistory ?? true);
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(null);
  const [tempHistoryName, setTempHistoryName] = useState('');
  
  // Theme
  const [selectedTheme, setSelectedTheme] = useState<Theme>(user?.preferences?.theme || 'light');

  // Accessibility State
  const [activeA11y, setActiveA11y] = useState<Set<string>>(new Set());
  const EXCLUSIVE_MODES = ['grayscale', 'high-contrast', 'negative-contrast', 'light-bg'];

  // Help Chat State
  const [helpInput, setHelpInput] = useState('');
  const [helpMessages, setHelpMessages] = useState<{role: string, text: string}[]>([
    { role: 'model', text: 'שלום! אני אייבן, העוזר האישי שלך. כיצד אוכל לעזור לך להשתמש באתר?' }
  ]);
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  const helpEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === SettingsTab.HELP) {
      helpEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [helpMessages, activeTab]);
  
  useEffect(() => {
    const currentClasses = new Set<string>();
    document.body.classList.forEach(cls => {
      if (cls.startsWith('a11y-')) currentClasses.add(cls.replace('a11y-', ''));
    });
    setActiveA11y(currentClasses);
  }, []);

  const handleSaveProfile = () => {
    if (user) {
      onUpdateUser({ 
        ...user, 
        name,
        preferences: { ...user.preferences, saveHistory, theme: selectedTheme }
      });
      alert('ההגדרות נשמרו בהצלחה!');
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme as Theme);
    if (user) {
        onUpdateUser({
            ...user,
            preferences: { ...user.preferences, theme: theme as Theme }
        });
    }
  };
  
  const handleToggleHistorySave = () => {
    const newVal = !saveHistory;
    setSaveHistory(newVal);
    if (user) {
        onUpdateUser({
            ...user,
            preferences: { ...user.preferences, saveHistory: newVal }
        });
    }
  };

  const startRenameHistory = (index: number, currentName: string) => {
    setEditingHistoryIndex(index);
    setTempHistoryName(currentName);
  };

  const saveRenameHistory = (index: number) => {
    if (tempHistoryName.trim()) {
        onRenameHistoryItem?.(index, tempHistoryName);
    }
    setEditingHistoryIndex(null);
  };

  const toggleA11yOption = (option: string) => {
    const newSet = new Set(activeA11y);
    const className = `a11y-${option}`;
    const element = document.body;

    if (newSet.has(option)) {
      newSet.delete(option);
      element.classList.remove(className);
    } else {
      if (EXCLUSIVE_MODES.includes(option)) {
        EXCLUSIVE_MODES.forEach(mode => {
          if (newSet.has(mode)) {
            newSet.delete(mode);
            element.classList.remove(`a11y-${mode}`);
          }
        });
      }
      newSet.add(option);
      element.classList.add(className);
    }
    setActiveA11y(newSet);
  };

  const sendHelpMessage = async () => {
    if (!helpInput.trim()) return;
    const userMsg = { role: 'user', text: helpInput };
    setHelpMessages(prev => [...prev, userMsg]);
    setHelpInput('');
    setIsHelpLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: `You are a help support agent for the app "Aivan". Answer briefly in Hebrew. User asked: ${helpInput}` }] }
        ]
      });
      const botMsg = { role: 'model', text: response.text || 'מצטער, לא הצלחתי לענות כרגע.' };
      setHelpMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setHelpMessages(prev => [...prev, { role: 'model', text: 'שגיאת תקשורת.' }]);
    } finally {
      setIsHelpLoading(false);
    }
  };

  const handleCancelSubscription = () => {
      if (!user?.isPremium) return;
      
      const confirmed = confirm(
          "האם אתה בטוח שברצונך לבטל את המנוי?\n" +
          "הפעולה תחזיר אותך לתוכנית החינמית ותבטל את הגישה לפיצ'רים של הפרימיום באופן מיידי."
      );

      if (confirmed) {
          // Immediately update user object and call parent update function
          const updatedUser: User = {
              ...user,
              isPremium: false,
              hasAdSupportedPremium: false
          };
          onUpdateUser(updatedUser);
          
          alert("המנוי בוטל בהצלחה. חזרת לתוכנית החינמית.");
      }
  };

  const tabs = [
    { id: SettingsTab.ACCOUNT, label: 'חשבון', icon: 'fa-user' },
    { id: SettingsTab.PREMIUM, label: 'ניהול פרימיום', icon: 'fa-crown' },
    { id: SettingsTab.INTERFACE, label: 'עיצוב וממשק', icon: 'fa-palette' },
    { id: SettingsTab.HISTORY, label: 'הגדרות היסטוריה', icon: 'fa-history' },
    { id: SettingsTab.ACCESSIBILITY, label: 'נגישות', icon: 'fa-universal-access' },
    { id: SettingsTab.HELP, label: 'עזרה ותמיכה', icon: 'fa-headset' },
    { id: SettingsTab.ABOUT, label: 'אודות', icon: 'fa-info-circle' },
    { id: SettingsTab.TERMS, label: 'תנאי שימוש', icon: 'fa-file-contract' },
  ];

  const a11yOptions = [
    { id: 'grayscale', label: 'גווני אפור', icon: 'fa-adjust' },
    { id: 'high-contrast', label: 'ניגודיות גבוהה', icon: 'fa-sun' },
    { id: 'negative-contrast', label: 'ניגודיות הפוכה', icon: 'fa-moon' },
    { id: 'light-bg', label: 'רקע בהיר', icon: 'fa-paint-roller' },
    { id: 'highlight-links', label: 'הדגשת קישורים', icon: 'fa-link' },
    { id: 'readable-font', label: 'פונט קריא', icon: 'fa-font' },
    { id: 'big-cursor', label: 'סמן גדול', icon: 'fa-mouse-pointer' },
    { id: 'stop-animations', label: 'עצור אנימציות', icon: 'fa-pause-circle' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex overflow-hidden slide-in-right">
      {/* Sidebar */}
      <div className="w-72 bg-white/95 backdrop-blur-xl border-l border-gray-200 flex flex-col shadow-2xl z-20">
        <div className="flex flex-col items-center mb-6 mt-8">
          <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg mb-3">
             <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                {user?.picture ? <img src={user.picture} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-700">{user?.name?.[0] || 'A'}</span>}
             </div>
          </div>
          <h3 className="font-bold text-gray-800 text-center truncate w-full px-4 text-lg">{user?.name || 'אורח'}</h3>
          <div className="flex items-center gap-1 mt-1">
             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user?.isPremium ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {user?.isPremium ? 'PREMIUM' : 'FREE PLAN'}
             </span>
             {user?.isAdmin && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">ADMIN</span>}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-purple-600'
              }`}
            >
              <i className={`fas ${tab.icon} w-8 text-lg ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`}></i>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
            <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors font-bold text-sm"
            >
            <i className="fas fa-sign-out-alt"></i>
            התנתק
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-gray-50 p-6 md:p-12 overflow-y-auto relative w-full">
          <button 
            onClick={onClose} 
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-800 shadow-md hover:shadow-lg transition-all z-50"
            title="סגור הגדרות"
          >
          <i className="fas fa-times text-xl"></i>
        </button>

        <div className="max-w-4xl mx-auto bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-white/50 min-h-[600px] animate-fadeIn">
          {activeTab === SettingsTab.ACCOUNT && (
            <div className="fade-in-up">
              <h2 className="text-3xl font-black mb-8 text-gray-900 border-b border-gray-100 pb-4">פרטי חשבון</h2>
              <div className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">שם מלא</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">אימייל</label>
                  <input 
                    type="text" 
                    value={user?.email || ''}
                    disabled
                    className="w-full px-5 py-4 rounded-2xl bg-gray-100 border border-transparent text-gray-500 cursor-not-allowed font-medium"
                  />
                </div>
                <button 
                  onClick={handleSaveProfile}
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-transform hover:-translate-y-1 shadow-lg mt-4 w-full md:w-auto"
                >
                  שמור שינויים
                </button>
              </div>
            </div>
          )}

          {activeTab === SettingsTab.PREMIUM && (
              <div className="fade-in-up">
                  <h2 className="text-3xl font-black mb-2 text-gray-900">ניהול פרימיום</h2>
                  <p className="text-gray-500 mb-8 pb-4 border-b border-gray-100">צפה בסטטוס המנוי שלך ובהטבות הפעילות.</p>
                  
                  {!user?.isPremium ? (
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white text-center shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-30 group-hover:opacity-50 transition-opacity"></div>
                          
                          <i className="fas fa-crown text-5xl text-yellow-400 mb-4 drop-shadow-lg"></i>
                          <h3 className="text-2xl font-bold mb-2">אתה משתמש בתוכנית החינמית</h3>
                          <p className="text-gray-300 mb-8 max-w-md mx-auto">שדרג עכשיו וקבל גישה למודלים חכמים יותר, עריכת קוד ידנית, ללא פרסומות ועוד!</p>
                          
                          <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 px-10 rounded-full shadow-lg hover:scale-105 transition-transform">
                              שדרג לפרימיום
                          </button>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Plan Status Card */}
                          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">תוכנית נוכחית</h3>
                                      <p className="text-2xl font-black text-gray-900 mt-1">
                                          {user?.hasAdSupportedPremium ? 'פרימיום (במימון פרסומות)' : 'פרימיום מלא (PRO)'}
                                      </p>
                                  </div>
                                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> פעיל
                                  </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                  {user?.hasAdSupportedPremium 
                                      ? 'אתה נהנה מכל פיצ\'רי הפרימיום בתמורה להצגת פרסומות באתרים שלך.' 
                                      : 'תודה שאתה תומך ב-Aivan!'}
                              </p>
                              
                              <button 
                                onClick={handleCancelSubscription}
                                className="mt-8 w-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                              >
                                  <i className="fas fa-ban"></i> ביטול מנוי וחזרה לגרסה החינמית
                              </button>
                          </div>

                          {/* Benefits List */}
                          <div className="bg-purple-50 rounded-3xl p-6 border border-purple-100">
                              <h3 className="font-bold text-purple-900 mb-4">ההטבות שלך</h3>
                              <ul className="space-y-3">
                                  <li className="flex items-center gap-3 text-sm text-gray-700">
                                      <i className="fas fa-check-circle text-green-500"></i> גישה למודל Aivan Pro החכם
                                  </li>
                                  <li className="flex items-center gap-3 text-sm text-gray-700">
                                      <i className="fas fa-check-circle text-green-500"></i> עריכת קוד ידנית מלאה
                                  </li>
                                  <li className="flex items-center gap-3 text-sm text-gray-700">
                                      <i className="fas fa-check-circle text-green-500"></i> יצירת קוד ב-Python, React, Node.js
                                  </li>
                                  <li className="flex items-center gap-3 text-sm text-gray-700">
                                      <i className={`fas fa-check-circle ${user?.hasAdSupportedPremium ? 'text-gray-400' : 'text-green-500'}`}></i> 
                                      <span className={user?.hasAdSupportedPremium ? 'line-through text-gray-400' : ''}>ללא פרסומות בטעינה</span>
                                      {user?.hasAdSupportedPremium && <span className="text-xs text-purple-600 bg-purple-100 px-2 rounded-full mr-2">Ad-Supported</span>}
                                  </li>
                              </ul>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === SettingsTab.INTERFACE && (
            <div className="fade-in-up">
              <h2 className="text-3xl font-black mb-8 text-gray-900 border-b border-gray-100 pb-4">עיצוב וממשק</h2>
              
              <div className="space-y-6">
                <div className="mt-8">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">בחר ערכת נושא</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'light', name: 'בהיר', color: 'bg-white border-gray-200', textColor: 'text-gray-800' },
                        { id: 'dark', name: 'כהה', color: 'bg-gray-800 border-gray-700', textColor: 'text-gray-200' },
                        { id: 'midnight', name: 'לילה (Midnight)', color: 'bg-indigo-950 border-indigo-900', textColor: 'text-white' },
                        { id: 'sunset', name: 'שקיעה (Sunset)', color: 'bg-orange-50 border-orange-200', textColor: 'text-gray-800' },
                        { id: 'ocean', name: 'אוקיינוס (Ocean)', color: 'bg-cyan-50 border-cyan-200', textColor: 'text-gray-800' },
                        { id: 'forest', name: 'יער (Forest)', color: 'bg-green-50 border-green-200', textColor: 'text-gray-800' },
                        { id: 'cherry', name: 'דובדבן (Cherry)', color: 'bg-rose-50 border-rose-200', textColor: 'text-gray-800' },
                    ].map(theme => (
                        <div 
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={`p-4 border-2 rounded-2xl cursor-pointer relative shadow-sm hover:scale-105 transition-transform ${selectedTheme === theme.id ? 'border-purple-500 ring-4 ring-purple-100' : 'border-transparent'} ${theme.color}`}
                        >
                        {selectedTheme === theme.id && <div className={`absolute top-2 left-2 ${theme.id.includes('dark') || theme.id === 'midnight' ? 'text-white' : 'text-purple-600'}`}><i className="fas fa-check-circle"></i></div>}
                        <div className={`h-12 rounded-lg mb-2 shadow-inner opacity-50 ${theme.id.includes('dark') || theme.id === 'midnight' ? 'bg-white/20' : 'bg-black/10'}`}></div>
                        <p className={`text-center font-bold text-xs ${theme.textColor}`}>{theme.name}</p>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === SettingsTab.HISTORY && (
             <div className="fade-in-up">
               <h2 className="text-3xl font-black mb-8 text-gray-900 border-b border-gray-100 pb-4">היסטוריה</h2>
               
               <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">שמירת היסטוריה אוטומטית</h3>
                    <p className="text-sm text-gray-500">השיחות שלך יישמרו בצורה מאובטחת במכשיר זה.</p>
                  </div>
                  <button 
                    onClick={handleToggleHistorySave}
                    className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${saveHistory ? 'bg-purple-600' : 'bg-gray-200'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${saveHistory ? '-translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>

               <div className="flex justify-between items-center mb-4 px-1">
                 <h3 className="font-bold text-gray-700">פרויקטים אחרונים</h3>
                 {history.length > 0 && (
                   <button 
                    onClick={() => {
                      if (confirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?')) {
                        onClearHistory?.();
                      }
                    }}
                    className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
                   >
                     <i className="fas fa-trash-alt ml-1"></i>
                     נקה הכל
                   </button>
                 )}
               </div>

               <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {history.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                      <i className="fas fa-ghost text-4xl mb-3 opacity-50"></i>
                      <p>אין היסטוריה עדיין</p>
                    </div>
                  ) : (
                    history.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group">
                         {editingHistoryIndex === index ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input 
                                    type="text" 
                                    value={tempHistoryName} 
                                    onChange={(e) => setTempHistoryName(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    autoFocus
                                />
                                <button onClick={() => saveRenameHistory(index)} className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                                    <i className="fas fa-check"></i>
                                </button>
                                <button onClick={() => setEditingHistoryIndex(null)} className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-500 rounded-lg hover:bg-red-200">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                         ) : (
                            <>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-code"></i>
                                    </div>
                                    <span className="truncate text-gray-700 font-medium max-w-[200px] md:max-w-xs" title={item}>{item}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                    onClick={() => startRenameHistory(index, item)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                                    title="שנה שם"
                                    >
                                    <i className="fas fa-pen text-xs"></i>
                                    </button>
                                    <button 
                                    onClick={() => onDeleteHistoryItem?.(index)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                    title="מחק פריט"
                                    >
                                    <i className="fas fa-trash text-xs"></i>
                                    </button>
                                </div>
                            </>
                         )}
                      </div>
                    ))
                  )}
               </div>
             </div>
          )}

          {activeTab === SettingsTab.ACCESSIBILITY && (
            <div className="fade-in-up">
               <h2 className="text-3xl font-black mb-8 text-gray-900 border-b border-gray-100 pb-4">נגישות</h2>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {a11yOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleA11yOption(opt.id)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl text-sm transition-all border h-40 group ${
                      activeA11y.has(opt.id) 
                        ? 'bg-gray-900 text-white border-gray-900 shadow-xl scale-105' 
                        : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <i className={`fas ${opt.icon} mb-4 text-3xl transition-transform group-hover:scale-110`}></i>
                    <span className="text-center font-bold">{opt.label}</span>
                    {activeA11y.has(opt.id) && <span className="mt-2 text-[10px] bg-white text-black font-bold px-2 py-0.5 rounded-full">פעיל</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === SettingsTab.HELP && (
             <div className="fade-in-up h-[500px] flex flex-col">
               <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                   <h2 className="text-3xl font-black text-gray-900">מרכז עזרה AI</h2>
                   <a 
                    href="mailto:vaxtoponline@gmail.com"
                    className="flex items-center gap-2 text-purple-600 bg-purple-50 hover:bg-purple-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                   >
                       <i className="fas fa-envelope"></i>
                       צור קשר
                   </a>
               </div>

               <div className="flex-1 bg-gray-50 rounded-3xl p-6 overflow-y-auto mb-4 border border-gray-200 space-y-4">
                 {helpMessages.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                     <div className={`max-w-[80%] px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                       {msg.text}
                     </div>
                   </div>
                 ))}
                 {isHelpLoading && (
                   <div className="flex justify-end">
                      <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-400 italic flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                   </div>
                 )}
                 <div ref={helpEndRef} />
               </div>
               <div className="flex gap-3 relative">
                 <input 
                  type="text" 
                  value={helpInput}
                  onChange={e => setHelpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendHelpMessage()}
                  placeholder="שאל אותי כל דבר על השימוש באתר..."
                  className="flex-1 px-6 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 shadow-sm transition-all"
                 />
                 <button onClick={sendHelpMessage} className="bg-gray-900 text-white w-16 rounded-2xl shadow-lg hover:bg-black transition-colors flex items-center justify-center text-xl">
                   <i className="fas fa-arrow-left transform rotate-45"></i>
                 </button>
               </div>
             </div>
          )}

          {activeTab === SettingsTab.TERMS && (
            <div className="fade-in-up">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
                 <h2 className="text-3xl font-black text-gray-900">תנאי שימוש</h2>
                 <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold border border-green-200 flex items-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    אושר בתאריך ההרשמה
                 </span>
              </div>
              <div className="h-96 overflow-y-auto bg-gray-50 p-8 rounded-3xl border border-gray-200 text-sm leading-relaxed text-gray-700 space-y-4">
                <p><strong>1. מבוא</strong><br/>ברוכים הבאים לאתר Aivan. השימוש באתר כפוף לתנאים אלו.</p>
                <p><strong>2. קניין רוחני</strong><br/>הקוד הנוצר שייך למשתמש, אך המערכת מסופקת AS-IS.</p>
                <p><strong>3. הגבלת אחריות</strong><br/>הצוות אינו אחראי לכל נזק ישיר או עקיף.</p>
                <p><strong>4. פרטיות</strong><br/>אנו מכבדים את פרטיותך ומשתמשים במידע לשיפור השירות בלבד.</p>
                <p><strong>5. טכנולוגיה</strong><br/>האתר עושה שימוש בטכנולוגיות צד ג' כולל Google Gemini, Groq LPU, ו-Open Models באמצעות AIMLAPI. השימוש בהם כפוף לתנאי השימוש של הספקים הרלוונטיים.</p>
              </div>
            </div>
          )}
          
          {activeTab === SettingsTab.ABOUT && (
            <div className="fade-in-up text-center pt-10 flex flex-col items-center h-full justify-center">
              <div className="w-32 h-32 bg-gray-900 rounded-[2rem] flex items-center justify-center text-white text-6xl font-black shadow-2xl mb-8 transform -rotate-6 hover:rotate-0 transition-transform duration-500">A</div>
              <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tighter">AIVAN</h1>
              <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed mb-8">
                העתיד של פיתוח אתרים כבר כאן.
                <br/>
                פלטפורמת AI מתקדמת למפתחים בעברית.
              </p>
              
              <div className="text-xs text-gray-400 mb-12 border border-gray-200 rounded-xl p-4 bg-gray-50 max-w-sm">
                 <p className="font-bold mb-2">מופעל באמצעות טכנולוגיות מתקדמות:</p>
                 <div className="flex gap-4 justify-center flex-wrap">
                     <span>Google Gemini</span>
                     <span>•</span>
                     <span>Groq LPU Inference</span>
                     <span>•</span>
                     <span>Open Models</span>
                 </div>
              </div>
              
              <div className="grid grid-cols-3 gap-8 mb-12 w-full max-w-md">
                  <div className="text-center">
                      <div className="font-black text-3xl text-purple-600">v1.3</div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Version</div>
                  </div>
                  <div className="text-center border-x border-gray-200">
                      <div className="font-black text-3xl text-blue-600">2025</div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Year</div>
                  </div>
                  <div className="text-center">
                      <div className="font-black text-3xl text-green-600">Pro</div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Multi-Model</div>
                  </div>
              </div>

              <div className="text-xs text-gray-400 font-mono">
                Built with React, Gemini AI & Love.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
