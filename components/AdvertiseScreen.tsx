
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';
import { AdRequest, AdMedia } from '../types';

interface AdvertiseScreenProps {
  onBack: () => void;
  onSubmit: (request: Omit<AdRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userEmail'>) => void;
}

const AdvertiseScreen: React.FC<AdvertiseScreenProps> = ({ onBack, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [budget, setBudget] = useState(1000);
  const [mediaFiles, setMediaFiles] = useState<AdMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsLoading(true);
          const newFiles: AdMedia[] = [];
          
          for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              try {
                  const base64 = await fileToBase64(file);
                  newFiles.push({
                      name: file.name,
                      type: file.type.startsWith('video') ? 'video' : 'image',
                      data: base64
                  });
              } catch (err) {
                  console.error("Error reading file", file.name, err);
              }
          }
          
          setMediaFiles(prev => [...prev, ...newFiles]);
          setIsLoading(false);
      }
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const removeFile = (index: number) => {
      setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!description.trim()) {
        alert('אנא מלא תיאור לפרסומת');
        return;
    }
    
    if (mediaFiles.length === 0) {
        alert('חובה להעלות תמונה או וידאו לפרסומת');
        return;
    }
    
    onSubmit({
        description,
        budget,
        mediaFiles,
        targetUrl: targetUrl.trim() || undefined
    });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 0;
      if (val > 100000) val = 100000;
      setBudget(val);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient p-4 relative">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-3xl border border-white/40 fade-in-up relative max-h-[90vh] overflow-y-auto">
        
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
            <i className="fas fa-times text-2xl"></i>
        </button>

        <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-gray-800 tracking-tight mb-2">פרסום באתר</h1>
            <p className="text-gray-500">הגיעו לאלפי מפתחים ויוצרים המשתמשים ב-Aivan מדי יום.</p>
        </div>

        <div className="space-y-6 max-w-xl mx-auto">
            
            {/* Description */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">תיאור הקמפיין <span className="text-red-500">*</span></label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="תאר את המוצר או השירות, קהל היעד והמטרות..."
                    className="w-full h-24 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 resize-none text-gray-900 placeholder-gray-400"
                />
            </div>

            {/* Link (Optional) */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">קישור לאתר (אופציונלי)</label>
                <div className="relative">
                    <i className="fas fa-link absolute top-3.5 right-4 text-gray-400"></i>
                    <input 
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://www.example.com"
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900 text-left placeholder-gray-400"
                        dir="ltr"
                    />
                </div>
            </div>

            {/* Budget Slider + Input */}
            <div>
                <div className="flex justify-between items-end mb-4">
                     <label className="text-sm font-bold text-gray-700">תקציב חודשי משוער</label>
                     <div className="flex items-center gap-2">
                         <input 
                            type="number" 
                            value={budget} 
                            onChange={handleBudgetChange}
                            className="w-24 px-2 py-1 text-lg font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded text-center outline-none focus:ring-1 focus:ring-purple-500"
                         />
                         <span className="text-purple-600 font-bold">₪</span>
                     </div>
                </div>
                
                <input 
                    type="range" 
                    min="0" 
                    max="100000" 
                    step="500"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
            </div>

            {/* File Upload (Mandatory) */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">מדיה לפרסום (ניתן להעלות מספר קבצים) <span className="text-red-500">*</span></label>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                    {mediaFiles.map((file, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden h-24 border border-gray-200 bg-gray-100">
                             {file.type === 'image' ? (
                                 <img src={file.data} alt="preview" className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-black">
                                     <i className="fas fa-play text-white"></i>
                                 </div>
                             )}
                             <button 
                                onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 <i className="fas fa-times"></i>
                             </button>
                        </div>
                    ))}
                    
                    <div className={`border-2 border-dashed rounded-lg flex items-center justify-center h-24 transition-colors cursor-pointer relative ${isLoading ? 'bg-gray-100 cursor-wait' : 'border-purple-300 bg-purple-50 hover:bg-purple-100'}`}>
                        <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*,video/*"
                            multiple
                            disabled={isLoading}
                            onChange={handleFileSelect}
                        />
                        <div className="text-center">
                            {isLoading ? (
                                <i className="fas fa-spinner fa-spin text-purple-500"></i>
                            ) : (
                                <>
                                    <i className="fas fa-plus text-purple-500 mb-1"></i>
                                    <span className="text-xs text-purple-600 block">הוסף מדיה</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                <p className="text-xs text-gray-500">גרור תמונות או סרטונים, או לחץ להוספה.</p>
            </div>

            {/* Submit */}
            <button 
                onClick={handleSend}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
                שלח למערכת לאישור
                <i className="fas fa-paper-plane mr-2"></i>
            </button>
            <p className="text-center text-xs text-gray-400">הבקשה תועבר למנהל המערכת לאישור לפני פרסום.</p>

        </div>
      </div>
    </div>
  );
};

export default AdvertiseScreen;
