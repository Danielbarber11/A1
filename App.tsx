
import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TermsScreen from './components/TermsScreen';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import PremiumScreen from './components/PremiumScreen';
import AdvertiseScreen from './components/AdvertiseScreen';
import AdManagementScreen from './components/AdManagementScreen';
import { Screen, ProjectConfig, User, AdRequest, SavedProject, ChatMode } from './types';
import { saveProjectToCloud, subscribeToProjects, saveUserPreferencesToCloud, logoutUser, auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.AUTH);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- PERSISTENT AUTH & CLOUD SYNC ---
  useEffect(() => {
    let unsubscribeProjects: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in
            const loggedUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: firebaseUser.displayName || "",
                picture: firebaseUser.photoURL || "",
                hasAcceptedTerms: true, // Assuming stored in DB (logic in AuthScreen handles initial save)
            };
            
            // Check for admin/premium overrides (can be fetched from DB, simplified here)
            if (loggedUser.email === 'vaxtoponline@gmail.com') {
                loggedUser.isAdmin = true;
                loggedUser.isPremium = true;
            }

            setCurrentUser(loggedUser);
            if (currentScreen === Screen.AUTH) {
                setCurrentScreen(Screen.HOME);
            }

            // --- REAL TIME SYNC START ---
            setIsSyncing(true);
            unsubscribeProjects = subscribeToProjects(firebaseUser.uid, (cloudProjects) => {
                setSavedProjects(cloudProjects);
                setIsSyncing(false);
            });

        } else {
            // User is signed out
            setCurrentUser(null);
            setCurrentScreen(Screen.AUTH);
            if (unsubscribeProjects) {
                unsubscribeProjects();
                unsubscribeProjects = null;
            }
        }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeProjects) unsubscribeProjects();
    };
  }, []);

  // --- SYSTEM ADS (Static) ---
  useEffect(() => {
    const savedAds = localStorage.getItem('aivan_ads');
    if (savedAds && JSON.parse(savedAds).length > 0) {
      setAdRequests(JSON.parse(savedAds));
    } else {
      const defaultAds: AdRequest[] = [
        { id: 'sys_1', userId: 'system', userEmail: 'System', description: 'הירשמו לרשימת ההמתנה למנוי פרימיום! קבלו גישה למודלים חכמים יותר ללא הגבלה.', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#', mediaFiles: [] },
        { id: 'sys_2', userId: 'system', userEmail: 'System', description: 'רוצים לפרסם כאן? הצטרפו למערכת הפרסום של Aivan והגיעו לאלפי מפתחים.', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#', mediaFiles: [] },
        { id: 'sys_3', userId: 'system', userEmail: 'System', description: 'בקרוב בפרימיום: אפשרות לפרסם את האתר שבניתם ישירות בתוך הפלטפורמה!', budget: 0, status: 'APPROVED', timestamp: Date.now(), targetUrl: '#', mediaFiles: [] }
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
    
    // Sync to Cloud
    if (currentUser.uid) {
        saveUserPreferencesToCloud(currentUser.uid, { hasAcceptedTerms: true });
    }
    setCurrentScreen(Screen.HOME);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    if (updatedUser.uid) {
        saveUserPreferencesToCloud(updatedUser.uid, updatedUser);
    }
  };

  const checkPremiumLimits = (language: string): boolean => {
      if (language !== 'HTML/CSS/JS' && !currentUser?.isPremium && !currentUser?.isAdmin) {
          alert("יצירת קוד בשפות מתקדמות (Python/React/Node) זמינה למנויי פרימיום בלבד.");
          setCurrentScreen(Screen.PREMIUM);
          return false;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastRequestDate = currentUser?.preferences?.lastRequestDate;
      let dailyCount = currentUser?.preferences?.dailyRequestsCount || 0;

      if (lastRequestDate !== today) dailyCount = 0;

      if (!currentUser?.isPremium && !currentUser?.isAdmin && dailyCount >= 30) {
          alert("הגעת למגבלת הבקשות היומית (30). שדרג לפרימיום להמשך עבודה ללא הגבלה!");
          setCurrentScreen(Screen.PREMIUM);
          return false;
      }
      
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

    const newProject: SavedProject = {
        id: Date.now().toString(),
        name: config.prompt, // Initially use prompt, will be auto-updated later
        language: config.language,
        model: config.model,
        lastModified: Date.now(),
        code: '',
        creatorMessages: [],
        questionMessages: [],
        codeHistory: []
    };

    if (currentUser.preferences?.saveHistory) {
        // Optimistic update
        const updatedProjects = [newProject, ...savedProjects];
        setSavedProjects(updatedProjects);
        
        // Sync to Cloud
        if (currentUser.uid) {
            saveProjectToCloud(currentUser.uid, newProject);
        }
    }

    setProjectConfig({ ...config, id: newProject.id });
    setCurrentScreen(Screen.WORKSPACE);
  };

  const handleOpenProject = (project: SavedProject) => {
      setProjectConfig({
          id: project.id,
          prompt: project.name,
          language: project.language,
          model: project.model,
          chatMode: ChatMode.CREATOR,
          initialCode: project.code || '',
          initialCreatorMessages: project.creatorMessages || [],
          initialQuestionMessages: project.questionMessages || [],
          initialCodeHistory: project.codeHistory || []
      });
      setCurrentScreen(Screen.WORKSPACE);
  };

  const handleSaveProjectProgress = (id: string, code: string, creatorMessages: any[], questionMessages: any[], codeHistory: string[], name?: string) => {
      if (!currentUser?.preferences?.saveHistory) return;
      
      // We update the local state optimistically, but the real source of truth is the Firestore listener
      // which will trigger setSavedProjects soon after saveProjectToCloud completes.
      
      const targetProject = savedProjects.find(p => p.id === id);
      if (targetProject) {
          const updatedP: SavedProject = { 
              ...targetProject, 
              code, 
              creatorMessages, 
              questionMessages, 
              codeHistory, 
              lastModified: Date.now() 
          };

          if (name) {
              updatedP.name = name;
          }
          
          if (currentUser?.uid) {
              saveProjectToCloud(currentUser.uid, updatedP);
          }
      }
  };

  const handleBackToDashboard = () => {
    setProjectConfig(null);
    setCurrentScreen(Screen.HOME);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setProjectConfig(null);
    setCurrentScreen(Screen.AUTH);
  };

  const handleClearHistory = () => {
    setSavedProjects([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    // Note: Actual deletion from cloud not implemented in this snippet to allow undo or archive,
    // but in a real app you'd call deleteDoc in firebase.ts
    const newProjects = savedProjects.filter(p => p.id !== id);
    setSavedProjects(newProjects);
  };

  const handleRenameHistoryItem = (id: string, newName: string) => {
    // Local optimistic update
    setSavedProjects(prev => {
        const updated = prev.map(p => p.id === id ? { ...p, name: newName } : p);
        const target = updated.find(p => p.id === id);
        if (target && currentUser?.uid) {
            saveProjectToCloud(currentUser.uid, target);
        }
        return updated;
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
          key={projectConfig.id} // Forces remount when project ID changes
          projectId={projectConfig.id}
          initialPrompt={projectConfig.prompt}
          initialLanguage={projectConfig.language}
          initialFiles={projectConfig.files || null}
          initialChatMode={projectConfig.chatMode}
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
