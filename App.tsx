
import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TermsScreen from './components/TermsScreen';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import PremiumScreen from './components/PremiumScreen';
import AdvertiseScreen from './components/AdvertiseScreen';
import AdManagementScreen from './components/AdManagementScreen';
import { Screen, ProjectConfig, User, AdRequest, SavedProject, ChatMode } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.AUTH);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  
  // Changed history from string[] to SavedProject[]
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);

  useEffect(() => {
    // Migrate old string history to new object history if needed
    const savedHistoryStr = localStorage.getItem('aivan_history');
    if (savedHistoryStr) {
        try {
            const parsed = JSON.parse(savedHistoryStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (typeof parsed[0] === 'string') {
                    // MIGRATION logic: Convert string prompts to basic project objects
                    const migratedProjects: SavedProject[] = parsed.map((prompt: string) => ({
                        id: Date.now().toString() + Math.random().toString(),
                        name: prompt,
                        prompt: prompt,
                        language: 'HTML/CSS/JS',
                        model: 'gemini-2.5-flash',
                        lastModified: Date.now(),
                        code: '',
                        creatorMessages: [],
                        questionMessages: [],
                        codeHistory: []
                    }));
                    setSavedProjects(migratedProjects);
                    localStorage.setItem('aivan_projects', JSON.stringify(migratedProjects));
                    localStorage.removeItem('aivan_history'); // Clean up old key
                } else {
                    // Already in new format (check key 'aivan_projects' below)
                    // If we loaded from 'aivan_history' but it's objects, just set it
                    setSavedProjects(parsed);
                }
            }
        } catch (e) { console.error("History migration error", e); }
    }

    // Load from new key
    const savedProjectsStr = localStorage.getItem('aivan_projects');
    if (savedProjectsStr) {
        try {
            setSavedProjects(JSON.parse(savedProjectsStr));
        } catch(e) { console.error("Load projects error", e); }
    }
    
    // Load ads from system storage
    const savedAds = localStorage.getItem('aivan_ads');
    if (savedAds && JSON.parse(savedAds).length > 0) {
      setAdRequests(JSON.parse(savedAds));
    } else {
      const defaultAds: AdRequest[] = [
        { id: 'sys_1', userId: 'system', userEmail: 'System', description: 'הירשמו לרשימת ההמתנה למנוי פרימיום! קבלו גישה למודלים חכמים יותר ללא הגבלה.', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#' },
        { id: 'sys_2', userId: 'system', userEmail: 'System', description: 'רוצים לפרסם כאן? הצטרפו למערכת הפרסום של Aivan והגיעו לאלפי מפתחים.', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#' },
        { id: 'sys_3', userId: 'system', userEmail: 'System', description: 'בקרוב בפרימיום: אפשרות לפרסם את האתר שבניתם ישירות בתוך הפלטפורמה!', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#' }
      ];
      setAdRequests(defaultAds);
      localStorage.setItem('aivan_ads', JSON.stringify(defaultAds));
    }
  }, []);

  const saveProjectsToStorage = (projects: SavedProject[]) => {
      localStorage.setItem('aivan_projects', JSON.stringify(projects));
      setSavedProjects(projects);
  };

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

  const checkPremiumLimits = (language: string): boolean => {
      // 1. Language Restriction
      if (language !== 'HTML/CSS/JS' && !currentUser?.isPremium && !currentUser?.isAdmin) {
          alert("יצירת קוד בשפות מתקדמות (Python/React/Node) זמינה למנויי פרימיום בלבד.");
          setCurrentScreen(Screen.PREMIUM);
          return false;
      }

      // 2. Daily Limit
      const today = new Date().toISOString().split('T')[0];
      const lastRequestDate = currentUser?.preferences?.lastRequestDate;
      let dailyCount = currentUser?.preferences?.dailyRequestsCount || 0;

      if (lastRequestDate !== today) dailyCount = 0;

      if (!currentUser?.isPremium && !currentUser?.isAdmin && dailyCount >= 30) {
          alert("הגעת למגבלת הבקשות היומית (30). שדרג לפרימיום להמשך עבודה ללא הגבלה!");
          setCurrentScreen(Screen.PREMIUM);
          return false;
      }
      
      // Update usage
      if (currentUser) {
          const updatedUser = {
              ...currentUser,
              preferences: {
                  ...currentUser.preferences!,
                  dailyRequestsCount: dailyCount + 1,
                  lastRequestDate: today
              }
          };
          handleUpdateUser(updatedUser);
      }
      return true;
  };

  const handleStartProject = (config: ProjectConfig) => {
    if (!currentUser) return;
    if (!checkPremiumLimits(config.language)) return;

    // Create a new project object
    const newProject: SavedProject = {
        id: Date.now().toString(),
        name: config.prompt, // Prompt used as name initially
        language: config.language,
        model: config.model,
        lastModified: Date.now(),
        code: '',
        creatorMessages: [],
        questionMessages: [],
        codeHistory: []
    };

    if (currentUser.preferences?.saveHistory) {
        saveProjectsToStorage([newProject, ...savedProjects]);
    }

    setProjectConfig({ ...config, id: newProject.id });
    setCurrentScreen(Screen.WORKSPACE);
  };

  const handleOpenProject = (project: SavedProject) => {
      // Open existing project - DO NOT check limits or increment counter here, 
      // as we are just viewing/continuing work.
      setProjectConfig({
          id: project.id,
          prompt: project.name,
          language: project.language,
          model: project.model,
          chatMode: ChatMode.CREATOR,
          // PASS EXISTING STATE
          initialCode: project.code,
          initialCreatorMessages: project.creatorMessages,
          initialQuestionMessages: project.questionMessages,
          initialCodeHistory: project.codeHistory
      });
      setCurrentScreen(Screen.WORKSPACE);
  };

  // Called by Workspace to auto-save
  const handleSaveProjectProgress = (id: string, code: string, creatorMessages: any[], questionMessages: any[], codeHistory: string[]) => {
      if (!currentUser?.preferences?.saveHistory) return;
      
      const updatedProjects = savedProjects.map(p => {
          if (p.id === id) {
              return { 
                  ...p, 
                  code, 
                  creatorMessages, 
                  questionMessages, 
                  codeHistory, 
                  lastModified: Date.now() 
              };
          }
          return p;
      });
      
      // Sort by last modified
      updatedProjects.sort((a, b) => b.lastModified - a.lastModified);
      saveProjectsToStorage(updatedProjects);
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
    saveProjectsToStorage([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const newProjects = savedProjects.filter(p => p.id !== id);
    saveProjectsToStorage(newProjects);
  };

  const handleRenameHistoryItem = (id: string, newName: string) => {
    const newProjects = savedProjects.map(p => p.id === id ? { ...p, name: newName } : p);
    saveProjectsToStorage(newProjects);
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
          onOpenProject={handleOpenProject}
          savedProjects={savedProjects}
          history={savedProjects.map(p => p.name)} // legacy format for list
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
          projectId={projectConfig.id}
          initialPrompt={projectConfig.prompt}
          initialLanguage={projectConfig.language}
          initialFiles={projectConfig.files || null}
          initialChatMode={projectConfig.chatMode}
          // Load existing state if available
          initialCode={projectConfig.initialCode}
          initialCreatorMessages={projectConfig.initialCreatorMessages}
          initialQuestionMessages={projectConfig.initialQuestionMessages}
          initialCodeHistory={projectConfig.initialCodeHistory}
          
          modelId={projectConfig.model}
          onBack={handleBackToDashboard}
          onSaveProject={handleSaveProjectProgress}
          user={currentUser}
          approvedAds={approvedAds}
          onActivateAdSupportedPremium={handleActivateAdSupportedPremium}
        />
      )}
    </div>
  );
};

export default App;
