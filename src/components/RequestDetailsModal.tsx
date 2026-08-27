import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Mail, Calendar, FileText, Download, ExternalLink, 
  Sparkles, Home, Stethoscope, MapPin, Accessibility, Users, 
  CheckCircle2, Clock, AlertCircle, ShieldCheck, Printer, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface HousingRequestRecord {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  dob_day: string;
  dob_month: string;
  dob_year: string;
  bac_year: string;
  registration_number: string;
  request_domain: string;
  housing_doc_type: string | null;
  transfer_reason: string | null;
  sibling_name: string | null;
  sibling_registration_number?: string | null;
  sibling_bac_year?: string | null;
  email: string;
  pdf_file_path: string;
  pdf_file_name: string;
  status: string;
  completed_at?: string | null;
  file_deleted?: boolean;
  file_deleted_at?: string | null;
}

interface RequestDetailsModalProps {
  request: HousingRequestRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (recordId: string, newStatus: string) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  isOpen,
  onClose,
  onStatusChange
}) => {
  const [downloading, setDownloading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!isOpen || !request) return null;

  const handleDownloadPDF = async () => {
    if (!request.pdf_file_path || request.file_deleted) {
      alert('الوثيقة غير متوفرة أو تم حذفها تلقائياً بعد مرور 24 ساعة.');
      return;
    }
    setDownloading(true);
    try {
      // 1. Direct signed URL from Supabase Storage client
      try {
        const { data, error: signedUrlErr } = await supabase.storage
          .from('housing_pdfs')
          .createSignedUrl(request.pdf_file_path, 300);

        if (!signedUrlErr && data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          return;
        }
      } catch (clientErr) {
        console.warn('Supabase client signed URL notice, trying server fallback:', clientErr);
      }

      // 2. Fallback to server endpoint
      const res = await fetch(`/api/storage/download-url?key=${encodeURIComponent(request.pdf_file_path)}`);
      if (res.ok) {
        const resData = await res.json();
        if (resData.downloadUrl) {
          window.open(resData.downloadUrl, '_blank');
          return;
        }
      }

      throw new Error('تعذر توليد رابط التحميل الآمن من Supabase Storage.');
    } catch (err: any) {
      console.error('Error generating signed URL:', err);
      alert(`خطأ في استخراج الوثيقة: ${err.message || 'يرجى التحقق من إعدادات التخزين'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleLocalStatusChange = async (newStatus: string) => {
    if (onStatusChange && request.id) {
      setUpdatingStatus(true);
      await onStatusChange(request.id, newStatus);
      setUpdatingStatus(false);
    }
  };

  // Calculate detailed remaining time until 24h deletion
  const getRemainingTimeDetails = () => {
    if (!request.completed_at || request.file_deleted) return null;
    const completedTime = new Date(request.completed_at).getTime();
    const expiryTime = completedTime + 24 * 60 * 60 * 1000;
    const remainingMs = expiryTime - Date.now();
    if (remainingMs <= 0) return { hours: 0, minutes: 0, expired: true, text: 'مؤهلة للحذف الآلي الآن', isUrgent: true };
    
    const totalMinutes = Math.floor(remainingMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return { 
        hours, 
        minutes, 
        expired: false, 
        text: `متبقي ${hours} ساعة و ${minutes} دقيقة على الحذف التلقائي`,
        isUrgent: hours <= 2 
      };
    } else {
      return { 
        hours: 0, 
        minutes, 
        expired: false, 
        text: `متبقي ${minutes} دقيقة على الحذف التلقائي (أقل من ساعة)`,
        isUrgent: true 
      };
    }
  };

  const timeDetails = getRemainingTimeDetails();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto" dir="rtl">
        
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[92vh] flex flex-col relative z-10 overflow-hidden my-auto"
        >
          
          {/* Modal Header (Fixed on scroll) */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-white flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center justify-center shrink-0">
                <User size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
                  <span className="truncate">{request.last_name} {request.first_name}</span>
                  <span className="text-[10px] sm:text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                    #{request.registration_number}
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                  تاريخ التقديم: {request.created_at ? new Date(request.created_at).toLocaleDateString('ar-DZ', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '-'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all shrink-0"
              title="إغلاق النافذة"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body (Scrollable with custom smooth scroll) */}
          <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-5 sm:space-y-6">
            
            {/* Status Control Box */}
            <div className="bg-slate-50/90 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">حالة الطلب:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs ${
                  request.status === 'جديد' || request.status === 'لم ينظر فيه' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                  request.status === 'قيد المعالجة' || request.status === 'قيد الدراسة' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                  request.status === 'مرفوض' ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  {request.status || 'جديد'}
                </span>
              </div>

              {onStatusChange && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-medium shrink-0">تحديث:</span>
                  <select
                    value={request.status || 'جديد'}
                    disabled={updatingStatus}
                    onChange={(e) => handleLocalStatusChange(e.target.value)}
                    className="w-full sm:w-auto bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-all shadow-2xs"
                  >
                    <option value="جديد">🟡 جديد (لم يُنظر فيه)</option>
                    <option value="قيد المعالجة">🔵 قيد المعالجة</option>
                    <option value="مكتمل">🟢 مكتمل (نقل للأرشيف)</option>
                    <option value="مرفوض">🔴 مرفوض</option>
                  </select>
                </div>
              )}
            </div>

            {/* Content Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Personal Details */}
              <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <User size={15} className="text-emerald-600 shrink-0" />
                  البيانات الشخصية
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">الاسم واللقب:</span>
                    <span className="font-bold text-slate-900 text-left">{request.last_name} {request.first_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">تاريخ الميلاد:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {request.dob_day}/{request.dob_month}/{request.dob_year}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">البريد الإلكتروني:</span>
                    <span className="font-mono font-bold text-slate-800 dir-ltr text-right truncate max-w-[180px] sm:max-w-none">{request.email}</span>
                  </div>
                </div>
              </div>

              {/* Bac Details */}
              <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  شهادة البكالوريا
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">رقم التسجيل:</span>
                    <span className="font-mono font-bold text-emerald-800">{request.registration_number}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">دفعة البكالوريا:</span>
                    <span className="font-mono font-bold text-slate-800">دفعة {request.bac_year}</span>
                  </div>
                </div>
              </div>

              {/* Service & Justifications */}
              <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/60 space-y-3 sm:col-span-2">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <Home size={15} className="text-amber-600 shrink-0" />
                  تفاصيل الخدمة المطلوبة والوثائق
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">طبيعة الخدمة:</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{request.request_domain}</span>
                  </div>

                  {request.housing_doc_type && (
                    <div>
                      <span className="text-slate-500 block">وثيقة التبرير للإيواء:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{request.housing_doc_type}</span>
                    </div>
                  )}

                  {request.transfer_reason && (
                    <div>
                      <span className="text-slate-500 block">سبب تغيير الإقامة:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{request.transfer_reason}</span>
                    </div>
                  )}

                  {request.sibling_name && request.transfer_reason !== 'أخوة' && (
                    <div>
                      <span className="text-slate-500 block">اسم الشقيق(ة) للم شمل الإخوة:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{request.sibling_name}</span>
                    </div>
                  )}

                  {request.transfer_reason === 'أخوة' && (request.sibling_name || request.sibling_registration_number || request.sibling_bac_year) && (
                    <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs pb-2 border-b border-slate-200/60">
                        <Users size={16} className="text-emerald-600" />
                        <span>بيانات الأخ أو الأخت (الطالب المستضيف لم شمل الإخوة):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">اسم ولقب الأخ أو الأخت:</span>
                          <span className="font-bold text-slate-900 mt-0.5 block text-sm">{request.sibling_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">سنة البكالوريا للأخ/الأخت:</span>
                          <span className="font-bold text-slate-900 mt-0.5 block font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/70 inline-block">
                            {request.sibling_bac_year ? `دفعة ${request.sibling_bac_year}` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">رقم تسجيل البكالوريا (الماتريكيل):</span>
                          <span className="font-bold text-emerald-800 mt-0.5 block font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 inline-block">
                            {request.sibling_registration_number || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Document & Lifecycle Status Box */}
              <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200/90 space-y-3 sm:col-span-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="text-emerald-700 shrink-0" size={22} />
                    <div className="min-w-0">
                      <h5 className="font-bold text-emerald-900 text-xs">وثيقة الطالب المرفقة (Supabase Storage PDF)</h5>
                      <p className="text-[11px] text-emerald-700 font-mono truncate max-w-[220px] sm:max-w-xs">{request.pdf_file_name || 'وثيقة الطالب المرفقة.pdf'}</p>
                    </div>
                  </div>

                  {request.file_deleted ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>تم حذف الوثيقة تلقائياً لمرور 24 ساعة على اكتمال الطلب</span>
                    </div>
                  ) : request.pdf_file_path ? (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                      {timeDetails && (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border ${
                          timeDetails.isUrgent 
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' 
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          <Clock size={13} className={timeDetails.isUrgent ? 'text-amber-700' : 'text-emerald-700'} />
                          {timeDetails.text}
                        </span>
                      )}
                      <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {downloading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Download size={15} />
                            تحميل وتنزيل PDF
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">لا توجد وثيقة مرفقة</span>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Printer size={15} />
              طباعة استمارة الطلب
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
