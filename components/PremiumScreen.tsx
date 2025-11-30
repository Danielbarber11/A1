
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';

interface PremiumScreenProps {
  onBack: () => void;
}

const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoinWaitlist = () => {
    if (!email.trim() || !email.includes('@')) {
        alert('אנא הכנס כתובת אימייל תקינה');
        return;
    }
    
    // Save to local storage (Simulation of DB)
    const existingWaitlist = localStorage.getItem('aivan_waitlist');
    const waitlist = existingWaitlist ? JSON.parse(existingWaitlist) : [];
    
    if (!waitlist.includes(email)) {
        waitlist.push(email);
        localStorage.setItem('aivan_waitlist', JSON.stringify(waitlist));
    }
    
    setJoined(true);
    setEmail('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient p-4 relative">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-4xl border border-white/40 fade-in-up relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20"></div>

        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
            <i className="fas fa-times text-2xl"></i>
        </button>

        <div className="text-center mb-10 mt-4">
            <div className="inline-block p-4 rounded-full bg-yellow-100 text-yellow-600 mb-4 shadow-inner">
                <i className="fas fa-crown text-4xl animate-pulse"></i>
            </div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 tracking-tight">
                בקרוב: אייבן פרימיום
            </h1>
            <p className="text-xl text-gray-500 mt-2 font-light">המנוי אינו זמין כרגע לרכישה. הצטרפו לרשימת ההמתנה.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* Left Side: Text */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 inline-block">
                    מה יש בגרסת פרימיום (בעתיד)?
                </h2>
                
                <ul className="space-y-4">
                    <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 hover:bg-yellow-50 hover:border-yellow-200 transition-colors">
                        <div className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-code"></i>
                        </div>
                        <div>
                            <span className="font-bold text-gray-800 block">בחירת סוג קוד מתקדם</span>
                            <span className="text-sm text-gray-500">אפשרות לבחור שפות שאינן HTML (כמו Python, Node.js ועוד).</span>
                        </div>
                    </li>

                    <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 hover:bg-yellow-50 hover:border-yellow-200 transition-colors">
                        <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-brain"></i>
                        </div>
                        <div>
                            <span className="font-bold text-gray-800 block">מצב חכם ללא הגבלה</span>
                            <span className="text-sm text-gray-500">שימוש חופשי במודל Pro החכם, ללא מגבלה של 30 בקשות ביום.</span>
                        </div>
                    </li>

                    <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 hover:bg-yellow-50 hover:border-yellow-200 transition-colors">
                        <div className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-ad"></i>
                        </div>
                        <div>
                            <span className="font-bold text-gray-800 block">ללא פרסומות</span>
                            <span className="text-sm text-gray-500">חווית שימוש נקייה, חלקה וללא הפרעות בשטחי הטעינה.</span>
                        </div>
                    </li>

                    <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 hover:bg-yellow-50 hover:border-yellow-200 transition-colors">
                        <div className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-edit"></i>
                        </div>
                        <div>
                            <span className="font-bold text-gray-800 block">עריכת קוד ידנית</span>
                            <span className="text-sm text-gray-500">גישה מלאה לעורך הקוד המתקדם לביצוע שינויים ידניים באתר.</span>
                        </div>
                    </li>
                </ul>
            </div>

            {/* Right Side: Visual/CTA */}
            <div className="flex flex-col items-center justify-center bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-90"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-600 rounded-full blur-[100px] opacity-30"></div>
                
                <div className="relative z-10 text-center w-full">
                    <h3 className="text-2xl font-bold mb-2">הצטרפו למהפכה</h3>
                    <p className="text-gray-400 mb-6 text-sm">הירשמו לרשימת ההמתנה וקבלו עדכון ראשונים.</p>
                    
                    {joined ? (
                         <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-xl animate-pulse">
                             <i className="fas fa-check-circle text-2xl mb-2"></i>
                             <p className="font-bold">נרשמת בהצלחה!</p>
                             <p className="text-xs">נודיע לך ברגע שהשירות יהיה זמין.</p>
                         </div>
                    ) : (
                        <>
                            <div className="flex w-full mb-4">
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="הכנס אימייל..." 
                                    className="flex-1 px-4 py-2 rounded-r-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:bg-white/20" 
                                />
                                <button 
                                    onClick={handleJoinWaitlist}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold px-6 py-2 rounded-l-lg hover:shadow-lg hover:brightness-110 transition-all"
                                >
                                    עדכנו אותי
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">* לא נשלח ספאם, מבטיחים.</p>
                        </>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default PremiumScreen;
