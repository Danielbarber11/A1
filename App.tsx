
import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TermsScreen from './components/TermsScreen';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import PremiumScreen from './components/PremiumScreen';
import AdvertiseScreen from './components/AdvertiseScreen';
import AdManagementScreen from './components/AdManagementScreen';
import { Screen, ProjectConfig, User, AdRequest } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.AUTH);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('aivan_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    // Load ads from system storage
    const savedAds = localStorage.getItem('aivan_ads');
    if (savedAds && JSON.parse(savedAds).length > 0) {
      setAdRequests(JSON.parse(savedAds));
    } else {
      // Inject Default System Ads if no ads exist
      const defaultAds: AdRequest[] = [
        { id: 'sys_1', userId: 'system', userEmail: 'System', description: 'הירשמו לרשימת ההמתנה למנוי פרימיום! קבלו גישה למודלים חכמים יותר ללא הגבלה.', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#' },
        { id: 'sys_2', userId: 'system', userEmail: 'System', description: 'רוצים לפרסם כאן? הצטרפו למערכת הפרסום של Aivan והגיעו לאלפי מפתחים.', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#' },
        { id: 'sys_3', userId: 'system', userEmail: 'System', description: 'בקרוב בפרימיום: אפשרות לפרסם את האתר שבניתם ישירות בתוך הפלטפורמה!', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#' }
      ];
      setAdRequests(defaultAds);
      localStorage.setItem('aivan_ads', JSON.stringify(defaultAds));
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.hasAcceptedTerms) setCurrentScreen(Screen.HOME);
    else setCurrentScreen(Screen.TERMS);
  };

  const handleTermsAccepted = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, hasAcceptedTerms: true };
    setCurrentUser(updatedUser);
    updateLocalStorage(updatedUser);
    setCurrentScreen(Screen.HOME);
  };

  const updateLocalStorage = (user: User) => {
    const usersStr = localStorage.getItem('aivan_users');
    if (usersStr) {
      const users: User[] = JSON.parse(usersStr);
      const updatedUsers = users.map(u => u.email === user.email ? user : u);
      localStorage.setItem('aivan_users', JSON.stringify(updatedUsers));
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    updateLocalStorage(updatedUser);
  };

  const handleStartProject = (config: ProjectConfig) => {
    if (!currentUser) return;

    // --- ENFORCE PREMIUM LIMITS ---

    // 1. Check Language Restriction (Only HTML allowed for Free)
    if (config.language !== 'HTML/CSS/JS' && !currentUser.isPremium && !currentUser.isAdmin) {
        alert("יצירת קוד בשפות מתקדמות (Python/React/Node) זמינה למנויי פרימיום בלבד.");
        setCurrentScreen(Screen.PREMIUM);
        return;
    }

    // 2. Check Daily Limit (30/day) for non-premium
    const today = new Date().toISOString().split('T')[0];
    const lastRequestDate = currentUser.preferences?.lastRequestDate;
    let dailyCount = currentUser.preferences?.dailyRequestsCount || 0;

    if (lastRequestDate !== today) {
        dailyCount = 0; // Reset for new day
    }

    if (!currentUser.isPremium && !currentUser.isAdmin && dailyCount >= 30) {
        alert("הגעת למגבלת הבקשות היומית (30). שדרג לפרימיום להמשך עבודה ללא הגבלה!");
        setCurrentScreen(Screen.PREMIUM);
        return;
    }

    // Increment and Save Usage
    const updatedUser = {
        ...currentUser,
        preferences: {
            ...currentUser.preferences,
            dailyRequestsCount: dailyCount + 1,
            lastRequestDate: today,
            // Fallback for required props
            enterToSend: currentUser.preferences?.enterToSend || false,
            streamCode: true,
            saveHistory: currentUser.preferences?.saveHistory ?? true
        }
    };
    handleUpdateUser(updatedUser);

    setProjectConfig(config);
    
    if (updatedUser.preferences?.saveHistory) {
      setHistory(prev => {
          const newHistory = [config.prompt, ...prev.filter(p => p !== config.prompt)];
          const limitedHistory = newHistory.slice(0, 20);
          localStorage.setItem('aivan_history', JSON.stringify(limitedHistory));
          return limitedHistory;
      }); 
    }
    setCurrentScreen(Screen.WORKSPACE);
  };

  const handleBackToDashboard = () => {
    setProjectConfig(null);
    setCurrentScreen(Screen.HOME);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setProjectConfig(null);
    setCurrentScreen(Screen.AUTH);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('aivan_history');
  };

  const handleDeleteHistoryItem = (index: number) => {
    setHistory(prev => {
      const newHistory = prev.filter((_, i) => i !== index);
      localStorage.setItem('aivan_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleRenameHistoryItem = (index: number, newName: string) => {
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory[index]) newHistory[index] = newName;
      localStorage.setItem('aivan_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // --- AD SYSTEM LOGIC ---
  const handleCreateAd = (requestData: Omit<AdRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userEmail'>) => {
      if (!currentUser) return;
      const newAd: AdRequest = {
          ...requestData,
          id: Date.now().toString(),
          userId: currentUser.email,
          userEmail: currentUser.email,
          status: 'PENDING',
          timestamp: Date.now()
      };
      const updatedAds = [...adRequests, newAd];
      setAdRequests(updatedAds);
      localStorage.setItem('aivan_ads', JSON.stringify(updatedAds));
      alert('הבקשה נשלחה לאישור בהצלחה!');
      setCurrentScreen(Screen.AD_MANAGEMENT);
  };

  const handleAdAction = (id: string, action: 'APPROVE' | 'REJECT' | 'DELETE') => {
      let updatedAds = [...adRequests];
      if (action === 'DELETE') {
          updatedAds = updatedAds.filter(ad => ad.id !== id);
      } else {
          updatedAds = updatedAds.map(ad => ad.id === id ? { ...ad, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : ad);
      }
      setAdRequests(updatedAds);
      localStorage.setItem('aivan_ads', JSON.stringify(updatedAds));
  };

  // --- ACTIVATE AD SUPPORTED PREMIUM ---
  const handleActivateAdSupportedPremium = () => {
      if (!currentUser) return;
      const updatedUser: User = { 
          ...currentUser, 
          isPremium: true, 
          hasAdSupportedPremium: true 
      };
      handleUpdateUser(updatedUser);
      alert("מזל טוב! מנוי הפרימיום הופעל בהצלחה. כעת יוצגו פרסומות באתרים שלך.");
  };
  
  const approvedAds = adRequests.filter(ad => ad.status === 'APPROVED');
  const userPendingAdsCount = adRequests.filter(ad => ad.status === 'PENDING').length;
  const hasUserAds = adRequests.some(ad => ad.userId === currentUser?.email);

  const themeClass = currentUser?.preferences?.theme ? `theme-${currentUser.preferences.theme}` : '';

  return (
    <div className={themeClass}>
      {currentScreen === Screen.AUTH && (
        <AuthScreen onLogin={handleAuthSuccess} onSignup={handleAuthSuccess} />
      )}
      {currentScreen === Screen.TERMS && (
        <TermsScreen onAccept={handleTermsAccepted} />
      )}
      {currentScreen === Screen.HOME && (
        <Dashboard 
          onStartProject={handleStartProject} 
          history={history}
          onLogout={handleLogout}
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          onClearHistory={handleClearHistory}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          onRenameHistoryItem={handleRenameHistoryItem}
          onShowPremium={() => setCurrentScreen(Screen.PREMIUM)}
          onShowAdvertise={() => setCurrentScreen(Screen.ADVERTISE)}
          onShowAdManagement={() => setCurrentScreen(Screen.AD_MANAGEMENT)}
          pendingAdsCount={currentUser?.isAdmin ? userPendingAdsCount : 0}
          hasUserAds={hasUserAds}
        />
      )}
      {currentScreen === Screen.PREMIUM && <PremiumScreen onBack={() => setCurrentScreen(Screen.HOME)} />}
      {currentScreen === Screen.ADVERTISE && <AdvertiseScreen onBack={() => setCurrentScreen(Screen.HOME)} onSubmit={handleCreateAd} />}
      {currentScreen === Screen.AD_MANAGEMENT && (
          <AdManagementScreen 
             user={currentUser}
             adRequests={adRequests}
             onApprove={(id) => handleAdAction(id, 'APPROVE')}
             onReject={(id) => handleAdAction(id, 'REJECT')}
             onDelete={(id) => handleAdAction(id, 'DELETE')}
             onBack={() => setCurrentScreen(Screen.HOME)}
             onCreateNew={() => setCurrentScreen(Screen.ADVERTISE)}
          />
      )}
      {currentScreen === Screen.WORKSPACE && projectConfig && (
        <Workspace 
          initialPrompt={projectConfig.prompt}
          initialLanguage={projectConfig.language}
          initialFiles={projectConfig.files || null}
          initialChatMode={projectConfig.chatMode}
          modelId={projectConfig.model}
          onBack={handleBackToDashboard}
          user={currentUser}
          approvedAds={approvedAds}
          onActivateAdSupportedPremium={handleActivateAdSupportedPremium}
        />
      )}
    </div>
  );
};

export default App;
