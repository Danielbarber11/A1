
import React from 'react';
import AccessibilityManager from './AccessibilityManager';
import { User, AdRequest } from '../types';

interface AdManagementScreenProps {
  user: User | null;
  adRequests: AdRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onCreateNew: () => void;
}

const AdManagementScreen: React.FC<AdManagementScreenProps> = ({ 
  user, 
  adRequests, 
  onApprove, 
  onReject, 
  onDelete, 
  onBack,
  onCreateNew
}) => {
  const isAdmin = user?.isAdmin;
  
  const visibleRequests = isAdmin 
      ? adRequests 
      : adRequests.filter(req => req.userId === user?.email);

  const pendingRequests = visibleRequests.filter(req => req.status === 'PENDING');
  const processedRequests = visibleRequests.filter(req => req.status !== 'PENDING');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('he-IL');

  return (
    <div className="min-h-screen w-full flex flex-col items-center animate-gradient p-4 relative">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 fade-in-up flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-3xl">
           <div className="flex items-center gap-4">
              <button 
                onClick={onBack} 
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center transition-all shadow-lg hover:scale-105 font-bold gap-2"
                title="חזור לדף הבית"
              >
                  <i className="fas fa-arrow-right"></i>
                  חזור
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                  {isAdmin ? 'ניהול בקשות פרסום (Admin)' : 'הפרסומות שלי'}
              </h1>
           </div>
           {!isAdmin && (
               <button onClick={onCreateNew} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:brightness-110 shadow-md flex items-center gap-2 transform transition-transform hover:-translate-y-1">
                   <i className="fas fa-plus"></i>
                   צור מודעה חדשה
               </button>
           )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
            
            {/* PENDING SECTION */}
            <section>
                <h2 className="text-lg font-bold text-gray-700 mb-4 border-r-4 border-yellow-400 pr-3 flex items-center gap-2">
                    <i className="fas fa-clock text-yellow-500"></i>
                    ממתין לאישור
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                </h2>

                {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 shadow-sm">
                        אין בקשות ממתינות
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-yellow-100 relative group hover:shadow-md transition-shadow">
                                <div className="absolute top-4 left-4 flex gap-2 z-10">
                                    {isAdmin ? (
                                        <>
                                            <button onClick={() => onApprove(req.id)} className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center shadow-sm" title="אשר"><i className="fas fa-check"></i></button>
                                            <button onClick={() => onReject(req.id)} className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center shadow-sm" title="דחה"><i className="fas fa-times"></i></button>
                                        </>
                                    ) : (
                                        <button onClick={() => onDelete(req.id)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-trash"></i></button>
                                    )}
                                </div>
                                <div className="pr-1">
                                    <h3 className="font-bold text-gray-800 mb-1">{isAdmin ? req.userEmail : 'פרסומת חדשה'}</h3>
                                    <p className="text-sm text-gray-500 mb-3">{formatDate(req.timestamp)}</p>
                                    
                                    {/* Media Gallery Preview */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                                        {req.mediaFiles && req.mediaFiles.map((media, i) => (
                                            <div key={i} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                                {media.type === 'image' ? (
                                                    <img src={media.data} alt="thumb" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-black flex items-center justify-center text-white text-xs"><i className="fas fa-video"></i></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-3 h-16 overflow-y-auto">{req.description}</div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-purple-600">{formatCurrency(req.budget)} / חודש</span>
                                        <div className="flex gap-2">
                                            {req.targetUrl && <a href={req.targetUrl} target="_blank" rel="noreferrer" className="text-blue-500 text-xs bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"><i className="fas fa-link ml-1"></i>קישור</a>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* PROCESSED SECTION */}
            <section>
                <h2 className="text-lg font-bold text-gray-700 mb-4 border-r-4 border-gray-300 pr-3">
                    היסטוריה
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {processedRequests.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">אין היסטוריה להצגה</div>
                    ) : (
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4">תאריך</th>
                                    <th className="p-4">מדיה</th>
                                    <th className="p-4">תיאור</th>
                                    <th className="p-4">תקציב</th>
                                    <th className="p-4">סטטוס</th>
                                    <th className="p-4">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-500">{formatDate(req.timestamp)}</td>
                                        <td className="p-4">
                                            {req.mediaFiles && req.mediaFiles.length > 0 && (
                                                <div className="w-10 h-10 rounded overflow-hidden border border-gray-200">
                                                     {req.mediaFiles[0].type === 'image' ? (
                                                         <img src={req.mediaFiles[0].data} className="w-full h-full object-cover" />
                                                     ) : (
                                                         <div className="w-full h-full bg-black flex items-center justify-center text-white"><i className="fas fa-video text-xs"></i></div>
                                                     )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-800 font-medium max-w-xs truncate">{req.description}</td>
                                        <td className="p-4 text-gray-600">{formatCurrency(req.budget)}</td>
                                        <td className="p-4">
                                            {req.status === 'APPROVED' ? (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1">
                                                    <i className="fas fa-check-circle"></i> אושר
                                                </span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1">
                                                    <i className="fas fa-times-circle"></i> נדחה
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => onDelete(req.id)} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

        </div>
      </div>
    </div>
  );
};

export default AdManagementScreen;
