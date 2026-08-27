import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Search, Filter, Calendar, Download, RefreshCcw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckCircle2, Archive, FileText, Eye, ShieldCheck, Clock, Trash2, Sparkles
} from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { AdminNavbar } from '../components/AdminNavbar';
import { RequestDetailsModal } from '../components/RequestDetailsModal';

interface HousingRequestRecord {
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
  email: string;
  pdf_file_path: string;
  pdf_file_name: string;
  status: string;
  completed_at?: string | null;
  file_deleted?: boolean;
  file_deleted_at?: string | null;
}

export const AdminCompleted: React.FC = () => {
  const [requests, setRequests] = useState<HousingRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupNotice, setCleanupNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('الكل');
  const [selectedBacYear, setSelectedBacYear] = useState<string>('الكل');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal Details State
  const [selectedRequest, setSelectedRequest] = useState<HousingRequestRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const navigate = useNavigate();

  const fetchCompletedRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('housing_requests')
        .select('*')
        .eq('status', 'مكتمل')
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (fetchErr) throw fetchErr;
      setRequests((data || []).filter(Boolean));
    } catch (err: any) {
      console.error('Error fetching completed requests:', err);
      const userMessage = await handleSupabaseError(err, () => {
        navigate('/admin/login', { replace: true });
      });
      setError(userMessage || 'فشل في جلب البيانات من الأرشيف.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedRequests();
    // Trigger automated background check for expired files on archive page mount
    fetch('/api/storage/cleanup', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDomain, selectedBacYear, itemsPerPage]);

  const handleOpenDetails = (record: HousingRequestRecord) => {
    setSelectedRequest(record);
    setIsDetailsOpen(true);
  };

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    if (!recordId) return;
    setUpdatingId(recordId);
    try {
      const updatePayload: Record<string, any> = { status: newStatus };
      if (newStatus === 'مكتمل') {
        updatePayload.completed_at = new Date().toISOString();
      } else {
        updatePayload.completed_at = null;
      }

      const { error: updateErr } = await supabase
        .from('housing_requests')
        .update(updatePayload)
        .eq('id', recordId);

      if (updateErr) throw updateErr;

      if (newStatus !== 'مكتمل') {
        setRequests(prev => (prev || []).filter(r => r && r.id !== recordId));
        if (selectedRequest?.id === recordId) {
          setIsDetailsOpen(false);
        }
      } else {
        setRequests(prev => (prev || []).map(r => r && r.id === recordId ? { ...r, ...updatePayload } : r));
        if (selectedRequest?.id === recordId) {
          setSelectedRequest(prev => prev ? { ...prev, ...updatePayload } : null);
        }
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(`فشل تحديث حالة الطلب: ${err.message || 'يرجى التحقق من صلاحيات الأمان'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadPDF = async (record: HousingRequestRecord) => {
    if (!record?.pdf_file_path || record?.file_deleted) {
      alert('لا توجد وثيقة مرفقة مع هذا الطلب أو تم حذفها تلقائياً بعد 24 ساعة.');
      return;
    }
    setDownloadingId(record.id);
    try {
      // 1. Direct signed URL from Supabase Storage client
      try {
        const { data, error: signedUrlErr } = await supabase.storage
          .from('housing_pdfs')
          .createSignedUrl(record.pdf_file_path, 300);

        if (!signedUrlErr && data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          return;
        }
      } catch (clientErr) {
        console.warn('Supabase client signed URL notice, trying server fallback:', clientErr);
      }

      // 2. Fallback to server endpoint
      const res = await fetch(`/api/storage/download-url?key=${encodeURIComponent(record.pdf_file_path)}`);
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
      alert(`خطأ في استخراج الوثيقة: ${err.message || 'يرجى التحقق من صلاحيات Storage'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Trigger manual 24-hour cleanup
  const handleTriggerCleanup = async () => {
    setCleaningUp(true);
    setCleanupNotice(null);
    try {
      const res = await fetch('/api/storage/cleanup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCleanupNotice(`✅ ${data.message || 'تم فحص وتنظيف الملفات المكتملة بنجاح.'}`);
        await fetchCompletedRequests();
      } else {
        throw new Error(data.error || 'فشل تشغيل عملية التنظيف');
      }
    } catch (cleanupErr: any) {
      setCleanupNotice(`⚠️ ${cleanupErr.message || 'تعذر تشغيل التنظيف'}`);
    } finally {
      setCleaningUp(false);
      setTimeout(() => setCleanupNotice(null), 6000);
    }
  };

  // Helper for detailed remaining time calculation
  const getRemainingTimeDetails = (record: HousingRequestRecord) => {
    if (!record.completed_at || record.file_deleted) return null;
    const completedTime = new Date(record.completed_at).getTime();
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
        text: `متبقي ${hours}h و ${minutes}m على الحذف`,
        isUrgent: hours <= 2 
      };
    } else {
      return { 
        hours: 0, 
        minutes, 
        expired: false, 
        text: `متبقي ${minutes} دقيقة (أقل من ساعة)`,
        isUrgent: true 
      };
    }
  };

  const availableBacYears = useMemo(() => {
    const list = Array.isArray(requests) ? requests.filter(Boolean) : [];
    const defaultYears = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];
    const fetchedYears = list.map(r => r?.bac_year).filter(Boolean);
    const combined = Array.from(new Set([...defaultYears, ...fetchedYears]));
    return combined.sort((a, b) => Number(b) - Number(a));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const list = Array.isArray(requests) ? requests.filter(Boolean) : [];
    return list.filter(record => {
      if (!record) return false;
      const firstName = record.first_name || '';
      const lastName = record.last_name || '';
      const regNum = record.registration_number || '';
      const email = record.email || '';

      const matchesSearch = 
        `${firstName} ${lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        regNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDomain = selectedDomain === 'الكل' || record.request_domain === selectedDomain;
      const matchesBacYear = selectedBacYear === 'الكل' || record.bac_year === selectedBacYear;

      return matchesSearch && matchesDomain && matchesBacYear;
    });
  }, [requests, searchTerm, selectedDomain, selectedBacYear]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = useMemo(() => {
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, startIndex, endIndex]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50/70 font-sans text-slate-900 selection:bg-emerald-200 pb-24 sm:pb-20">
      
      {/* Responsive Navbar & Mobile Bottom Dock */}
      <AdminNavbar
        title="أرشيف الطلبات المكتملة"
        subtitle="مديرية الخدمات الجامعية معسكر - الأرشيف النهائي وتتبع الملفات"
        onRefresh={fetchCompletedRequests}
        isLoading={loading}
      />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        
        {/* Sleek Emerald Archive Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 border border-white/10 shadow-inner">
              <Archive size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                أرشيف الطلبات المكتملة وحماية الخصوصية
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-normal px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                  Supabase Storage + 24h Auto-Delete
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
                يتم حفظ الطلبات المكتملة هنا بشكل دائم، مع حذف ملفات الـ PDF آلياً من سلة Supabase Storage بعد مرور 24 ساعة من اكتمال الطلب لحماية سرية الوثائق وتوفير مساحات التخزين.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto relative z-10 shrink-0">
            <button
              onClick={handleTriggerCleanup}
              disabled={cleaningUp}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-3 rounded-2xl border border-white/20 backdrop-blur-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              title="فحص وحذف الملفات المكتملة التي مر عليها أكثر من 24 ساعة الآن"
            >
              {cleaningUp ? (
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 size={16} className="text-emerald-400" />
              )}
              <span>فحص وحذف الملفات المؤهلة (24h)</span>
            </button>

            <div className="hidden sm:flex flex-col items-end bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
              <span className="text-[11px] text-emerald-200 font-semibold block">إجمالي المؤرشف</span>
              <span className="text-2xl font-extrabold font-mono text-emerald-400 block">{requests.length}</span>
            </div>
          </div>

          <div className="absolute left-0 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Notice Message if Cleanup Triggered */}
        {cleanupNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs"
          >
            <span>{cleanupNotice}</span>
            <button onClick={() => setCleanupNotice(null)} className="text-emerald-700 hover:text-emerald-950">✕</button>
          </motion.div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row gap-4 justify-between items-center">
          
          <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="ابحث في الأرشيف المكتمل بالاسم أو رقم التسجيل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pr-11 pl-4 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={17} className="text-slate-400 shrink-0" />
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full sm:w-52 bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value="الكل">جميع الخدمات المكتملة</option>
                <option value="إيواء">طلبات الإيواء</option>
                <option value="تغيير الإقامة">تغيير الإقامة الجامعية</option>
                <option value="تسوية دفع حقوق الإيواء">تسوية الحقوق</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar size={17} className="text-slate-400 shrink-0" />
              <select
                value={selectedBacYear}
                onChange={(e) => setSelectedBacYear(e.target.value)}
                className="w-full sm:w-52 bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value="الكل">جميع سنوات البكالوريا</option>
                {availableBacYears.map(year => (
                  <option key={year} value={year}>بكالوريا {year}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-semibold text-center border-b border-red-100">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">تاريخ الإكمال</th>
                  <th className="py-4 px-6">الطالب(ة)</th>
                  <th className="py-4 px-6">رقم وسنة البكالوريا</th>
                  <th className="py-4 px-6">نوع الخدمة</th>
                  <th className="py-4 px-6">حالة الطلب الإدارية</th>
                  <th className="py-4 px-6">حالة ملف الـ PDF (Storage)</th>
                  <th className="py-4 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-5 px-6"><div className="h-4 bg-slate-200 rounded-lg w-24"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-200 rounded-lg w-32"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-200 rounded-lg w-28"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-200 rounded-lg w-20"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-200 rounded-lg w-24"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-200 rounded-lg w-36"></div></td>
                      <td className="py-5 px-6"><div className="h-8 bg-slate-200 rounded-xl w-24 mx-auto"></div></td>
                    </tr>
                  ))
                ) : paginatedRequests.filter(Boolean).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <CheckCircle2 size={44} className="mx-auto mb-3 opacity-40 text-emerald-500" />
                      <p className="text-base font-bold text-slate-600">لا توجد طلبات مكتملة محفوظة بالأرشيف حالياً</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.filter(Boolean).map((record) => {
                    const timeDetails = getRemainingTimeDetails(record);
                    return (
                      <tr key={record?.id || Math.random()} className="hover:bg-slate-50/80 transition-colors">
                        
                        <td className="py-4 px-6 text-slate-500 text-xs font-mono">
                          {record?.completed_at ? new Date(record.completed_at).toLocaleDateString('ar-DZ', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : record?.created_at ? new Date(record.created_at).toLocaleDateString('ar-DZ', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : '-'}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetails(record)}
                            className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-right flex items-center gap-1.5 group cursor-pointer"
                          >
                            <span className="group-hover:underline">{record?.last_name || ''} {record?.first_name || ''}</span>
                          </button>
                        </td>

                        <td className="py-4 px-6 font-mono text-emerald-800 font-bold whitespace-nowrap">
                          {record?.registration_number || '-'}
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block ms-2 border border-slate-200/60">
                            دفعة {record?.bac_year || '-'}
                          </span>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            {record?.request_domain || '-'}
                          </span>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="relative inline-block">
                            <select
                              value={record?.status || 'مكتمل'}
                              disabled={updatingId === record?.id}
                              onChange={(e) => record?.id && handleStatusChange(record.id, e.target.value)}
                              className="bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                            >
                              <option value="مكتمل">🟢 مكتمل (محفوظ بالأرشيف)</option>
                              <option value="قيد المعالجة">🔵 قيد المعالجة (إعادة للجارية)</option>
                              <option value="جديد">🟡 جديد (إعادة للجارية)</option>
                              <option value="مرفوض">🔴 مرفوض</option>
                            </select>
                            {updatingId === record?.id && (
                              <div className="absolute right-2 top-2 w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            )}
                          </div>
                        </td>

                        {/* File Lifecycle Column */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {record?.file_deleted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80" title="تم حذف الملف تلقائياً بعد مرور 24 ساعة على اكتمال الطلب لحماية الخصوصية">
                              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                              تم الحذف الآلي (مرور 24h)
                            </span>
                          ) : record?.pdf_file_path && timeDetails ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                              timeDetails.isUrgent 
                                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`} title="يتم حذف الوثيقة تلقائياً من Supabase Storage بعد 24 ساعة من تاريخ الاكتمال">
                              <Clock size={14} className={timeDetails.isUrgent ? 'text-amber-600 shrink-0' : 'text-emerald-600 shrink-0'} />
                              {timeDetails.text}
                            </span>
                          ) : record?.pdf_file_path ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Clock size={14} className="text-emerald-600 shrink-0" />
                              متوفرة بالتخزين
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">لا توجد وثيقة</span>
                          )}
                        </td>

                        {/* View Details Modal & Download Actions */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {/* Open Full Details Modal Button */}
                            <button
                              onClick={() => handleOpenDetails(record)}
                              className="p-2.5 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white rounded-xl transition-all border border-slate-200 shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="عرض كافة تفاصيل الطلب"
                            >
                              <Eye size={17} />
                            </button>

                            {/* Download PDF Button if not deleted */}
                            {record?.pdf_file_path && !record?.file_deleted && (
                              <button
                                onClick={() => handleDownloadPDF(record)}
                                disabled={downloadingId === record.id}
                                className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl transition-all border border-emerald-200/90 active:scale-95 disabled:opacity-50 shadow-2xs shrink-0 cursor-pointer"
                                title="تحميل وثيقة PDF من Supabase Storage"
                              >
                                {downloadingId === record.id ? (
                                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Download size={17} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
            
            <div className="flex items-center gap-4">
              <span>
                عرض {filteredRequests.length > 0 ? startIndex + 1 : 0} إلى {Math.min(endIndex, filteredRequests.length)} من إجمالي <strong className="text-slate-800 font-bold">{filteredRequests.length}</strong> طلب مكتمل
              </span>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">عدد الصفوف:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5" dir="ltr">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="الصفحة الأولى"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="الصفحة السابقة"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs" dir="rtl">
                {currentPage} من {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="الصفحة التالية"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="الصفحة الأخيرة"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

          </div>
        </div>

      </main>

      {/* Full Details Modal Popup */}
      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
