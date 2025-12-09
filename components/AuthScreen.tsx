
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';
import { User } from '../types';
import { signInWithGoogle } from '../services/firebase';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSignup }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Firebase Google Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      // Check for Admin Override based on email
      if (user.email === 'vaxtoponline@gmail.com') {
          user.isAdmin = true;
          user.isPremium = true;
      }
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError('שגיאה בהתחברות לגוגל. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Legacy Local Storage / Admin Mock Login for fallback
    if (email === 'vaxtoponline@gmail.com' && password === '0101') {
        const adminUser: User = {
            email,
            name: 'Aivan Admin',
            hasAcceptedTerms: true,
            isAdmin: true,
            isPremium: true,
            uid: 'admin_mock_uid',
            preferences: { 
                enterToSend: false, 
                streamCode: true, 
                saveHistory: true, 
                theme: 'midnight' 
            }
        };
        onLogin(adminUser);
        return;
    }

    // Standard Local Login Fallback (If Firebase fails or for testing)
    const usersStr = localStorage.getItem('aivan_users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (isSignup) {
      if (users.find(u => u.email === email)) {
        setError('משתמש זה כבר קיים במערכת.');
        return;
      }
      const newUser: User = { 
        email, 
        password, 
        name: name || email.split('@')[0], 
        hasAcceptedTerms: false,
        uid: 'local_' + Date.now()
      };
      const updatedUsers = [...users, newUser];
      localStorage.setItem('aivan_users', JSON.stringify(updatedUsers));
      onSignup(newUser);
    } else {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('אימייל או סיסמה שגויים.');
      }
    }
  };

  const toggleMode = () => {
    setError('');
    setIsSignup(!isSignup);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center animate-gradient p-4 relative overflow-hidden">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      {/* 3D Flip Container */}
      <div className={`relative w-full max-w-md h-[550px] transition-transform duration-700 transform-style-3d perspective-1000 ${isSignup ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side (Login) */}
        <div className="absolute inset-0 backface-hidden">
          <div className="bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full h-full border border-white/30 flex flex-col justify-center">
            <h1 className="text-5xl font-black text-white text-center mb-4 drop-shadow-md tracking-wide">AIVAN</h1>
            <h2 className="text-lg text-white text-center mb-4 font-light">ברוכים השבים</h2>
            
            {error && !isSignup && (
              <div className="bg-red-500/80 text-white text-center p-2 rounded-lg mb-2 text-sm">{error}</div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-white text-xs block mb-1">אימייל</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-white text-purple-600 font-bold shadow-lg hover:scale-[1.02] transition-transform mt-2">
                התחבר
              </button>
            </form>

            <div className="relative my-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div>
               <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-white">או</span></div>
            </div>
            
            <button 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-white text-gray-800 font-bold shadow-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <div className="loader w-4 h-4 border-2 border-gray-400 border-top-purple-600"></div>
                ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                )}
                התחבר עם Google
            </button>

            <div className="mt-4 text-center">
              <button onClick={toggleMode} className="text-white hover:text-yellow-200 underline decoration-dotted text-sm">
                אין לך חשבון? הירשם עכשיו
              </button>
            </div>
          </div>
        </div>

        {/* Back Side (Signup) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full h-full border border-white/30 flex flex-col justify-center">
            <h1 className="text-5xl font-black text-white text-center mb-4 drop-shadow-md tracking-wide">AIVAN</h1>
            <h2 className="text-lg text-white text-center mb-4 font-light">יצירת חשבון חדש</h2>
            
            {error && isSignup && (
              <div className="bg-red-500/80 text-white text-center p-2 rounded-lg mb-2 text-sm">{error}</div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-white text-xs block mb-1">שם מלא</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">אימייל</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-white text-purple-600 font-bold shadow-lg hover:scale-[1.02] transition-transform mt-2">
                צור חשבון
              </button>
            </form>

             <div className="relative my-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div>
               <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-white">או</span></div>
            </div>

            <button 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-white text-gray-800 font-bold shadow-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <div className="loader w-4 h-4 border-2 border-gray-400 border-top-purple-600"></div>
                ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                )}
                הירשם עם Google
            </button>

            <div className="mt-4 text-center">
              <button onClick={toggleMode} className="text-white hover:text-yellow-200 underline decoration-dotted text-sm">
                כבר יש לך חשבון? התחבר
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthScreen;
