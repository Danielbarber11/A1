
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';

interface TermsScreenProps {
  onAccept: () => void;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ onAccept }) => {
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    setIsAccepted(true);
    setTimeout(() => {
       onAccept();
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient p-4 relative">
       {/* Accessibility Button - Top Right for Terms Screen */}
       <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-3xl fade-in-up border border-white/40 flex flex-col max-h-[90vh]">
        <h2 className="text-3xl font-black text-gray-900 mb-6 text-center border-b pb-4">תנאי שימוש ומדיניות פרטיות</h2>
        
        <div 
          className="bg-gray-50 border rounded-lg p-6 overflow-y-auto mb-6 text-gray-800 text-sm leading-relaxed shadow-inner flex-1"
        >
          <h3 className="font-bold text-lg mb-2 text-purple-700">1. הסכמה לשימוש</h3>
          <p className="mb-4">
            ברוכים הבאים לאפליקציית <strong>Aivan</strong> (להלן: "המערכת" או "האתר"). השימוש במערכת מהווה הסכמה מלאה ובלתי מסויגת לתנאים אלו.
            המסמך מנוסח בלשון זכר מטעמי נוחות אך פונה לנשים וגברים כאחד.
          </p>
          
          <h3 className="font-bold text-lg mb-2 text-purple-700">2. גילוי נאות - תוכנית שותפים (Amazon Associates)</h3>
          <div className="mb-4 bg-orange-50 p-4 rounded border border-orange-200 text-gray-800">
            <strong>גילוי נאות חשוב:</strong><br/>
            Aivan משתתפת בתוכנית השותפים של אמזון (Amazon Services LLC Associates Program), תוכנית פרסום שותפים שנועדה לספק אמצעי לאתרים להרוויח דמי פרסום על ידי פרסום וקישור ל-Amazon.com.
            <br/><br/>
            <strong>משמעות הדבר:</strong> המערכת עשויה להציג פרסומות, באנרים או קישורים למוצרים באתרים הנוצרים או בתוך ממשק המערכת. כל לחיצה על קישורים אלו וביצוע רכישה עשויה לזכות את מפעיל האתר בעמלה, ללא כל עלות נוספת מצדכם. הכנסות אלו מסייעות בתחזוקת הגרסה החינמית של המערכת.
          </div>

          <h3 className="font-bold text-lg mb-2 text-purple-700">3. טכנולוגיית AI והסרת אחריות (Google Gemini)</h3>
          <p className="mb-4">
            המערכת מבוססת על מודל השפה המלאכותי <strong>Google Gemini</strong>.
            <br/>
            <strong>הבהרה משפטית:</strong> מפעיל האתר אינו הבעלים של המודל, אינו שולט בפלטיו ואינו אחראי לתוכן הנוצר על ידו, לדיוקו, לאיכותו או להתאמתו למטרה כלשהי.
            <br/>
            כל שימוש בקוד, בטקסט או בתמונות שנוצרו על ידי המערכת הוא באחריות המשתמש/ת בלבד. במידה ונתקלת בבעיה הקשורה למודל עצמו או לתוכן פוגעני, האחריות חלה על ספקי הטכנולוגיה הרלוונטיים (Google).
          </p>
          
          <h3 className="font-bold text-lg mb-2 text-purple-700">4. פרטיות ושמירת נתונים</h3>
          <p className="mb-4">
            פרטי ההתחברות (שם, כתובת אימייל) נשמרים במסד הנתונים של המערכת בשרתי Google Cloud מאובטחים, אך ורק לצורך זיהוי המשתמש, שמירת הפרויקטים האישיים וסינכרון בין מכשירים. אנו לא נמכור את המידע לצד שלישי.
          </p>

          <p className="mb-4 text-gray-700 font-bold border-t pt-4 bg-gray-100 p-4 rounded-lg text-center">
            השימוש במערכת הוא באחריותך הבלעדית.
          </p>
        </div>

        <div className="flex flex-col items-center justify-end gap-2">
          <button 
            onClick={handleAccept}
            className="w-full md:w-auto px-12 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all text-lg flex items-center justify-center gap-3 group"
          >
            <span>אני מאשר/ת את התנאים</span>
            <i className="fas fa-check-circle text-green-400 group-hover:scale-110 transition-transform"></i>
          </button>
          <p className="text-xs text-gray-400 mt-2">לחיצה על הכפתור מהווה חתימה אלקטרונית מחייבת.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsScreen;
