import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Search, Filter, Home, Calendar, FileSpreadsheet, RefreshCcw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart3,
  Archive, Sparkles, CheckCircle2, Clock, Mail, Download, FileText, Layers, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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

export const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<HousingRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('الكل');
  const [selectedBacYear, setSelectedBacYear] = useState<string>('الكل');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal Detail View State
  const [selectedRequest, setSelectedRequest] = useState<HousingRequestRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const navigate = useNavigate();

  const fetchActiveRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('housing_requests')
        .select('*')
        .neq('status', 'مكتمل')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setRequests((data || []).filter(Boolean));
    } catch (err: any) {
      console.error('Error fetching active requests:', err);
      setError(err.message || 'فشل في جلب البيانات من القاعدة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRequests();
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

      if (newStatus === 'مكتمل') {
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
      alert('لا توجد وثيقة مرفقة مع هذا الطلب أو تم حذفها تلقائياً.');
      return;
    }
    setDownloadingId(record.id);
    try {
      // 1. Try Cloudflare R2 Presigned URL first
      try {
        const r2Res = await fetch(`/api/r2/download-url?key=${encodeURIComponent(record.pdf_file_path)}`);
        if (r2Res.ok) {
          const r2Data = await r2Res.json();
          if (r2Data.downloadUrl) {
            window.open(r2Data.downloadUrl, '_blank');
            return;
          }
        }
      } catch (r2Err) {
        console.warn('R2 download URL fetch notice, fallback to Supabase storage:', r2Err);
      }

      // 2. Fallback to Supabase Storage if uploaded previously via Supabase
      const { data, error: signedUrlErr } = await supabase.storage
        .from('housing_pdfs')
        .createSignedUrl(record.pdf_file_path, 60);

      if (signedUrlErr) throw signedUrlErr;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('تعذر توليد رابط التحميل الآمن.');
      }
    } catch (err: any) {
      console.error('Error generating signed URL:', err);
      alert(`خطأ في استخراج الوثيقة: ${err.message || 'يرجى التحقق من صلاحيات Storage'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const availableBacYears = useMemo(() => {
    const list = Array.isArray(requests) ? requests.filter(Boolean) : [];
    const defaultYears = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];
    const fetchedYears = list.map(r => r?.bac_year).filter(Boolean);
    const combined = Array.from(new Set([...defaultYears, ...fetchedYears]));
    return combined.sort((a, b) => Number(b) - Number(a));
  }, [requests]);

  const stats = useMemo(() => {
    const list = Array.isArray(requests) ? requests.filter(Boolean) : [];
    const totalActive = list.length;
    const newCount = list.filter(r => r && (r.status === 'جديد' || r.status === 'لم ينظر فيه')).length;
    const inProgressCount = list.filter(r => r && (r.status === 'قيد المعالجة' || r.status === 'قيد الدراسة')).length;
    const housing = list.filter(r => r && r.request_domain === 'إيواء').length;
    return { totalActive, newCount, inProgressCount, housing };
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
      
      {/* Responsive Top Header & Mobile Bottom Dock */}
      <AdminNavbar
        title="إدارة الطلبات الجارية"
        badgeText={stats.newCount > 0 ? `${stats.newCount} جديد` : undefined}
        onRefresh={fetchActiveRequests}
        isLoading={loading}
      />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        
        {/* Sleek Modern Hero Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-full border border-emerald-800/80 shadow-2xs">
              <Sparkles size={13} />
              منظومة معالجة الطلبات الجارية 2026-2027
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">مركز متابعة وفحص طلبات الخدمات الجامعية</h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed font-normal">
              منصة مركزية لفحص الملفات المستلمة حديثاً، مراجعة الوثائق المرفقة، وتغيير حالة الإيواء بنقرة واحدة. الطلبات المكتملة تنقل آلياً إلى الأرشيف.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 shadow-inner relative z-10">
            <div className="text-right">
              <span className="text-[11px] text-slate-300 font-semibold block">إجمالي الملفات الجارية</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 block mt-0.5">{stats.totalActive}</span>
            </div>
            {stats.newCount > 0 && (
              <span className="text-xs bg-amber-500 text-white font-extrabold px-3 py-1 rounded-full animate-pulse shadow-xs">
                {stats.newCount} طلب جديد يتطلب الفرز
              </span>
            )}
          </div>

          <div className="absolute left-0 bottom-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Executive Modern KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-slate-800 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي الجارية</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">{stats.totalActive}</h3>
            </div>
            <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center shrink-0">
              <FileSpreadsheet size={24} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-amber-500 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700">طلبات جديدة لم تُفتح</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 font-mono">{stats.newCount}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles size={24} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-blue-500 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600">جارية الدراسة والفرز</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">{stats.inProgressCount}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-emerald-500 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700">طلبات خدمة الإيواء</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">{stats.housing}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Home size={24} />
            </div>
          </motion.div>
        </div>

        {/* Refined Search & Filter Control Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row gap-4 justify-between items-center">
          
          <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="ابحث بالاسم، رقم التسجيل، البريد..."
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
                <option value="الكل">جميع الخدمات الجارية</option>
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

        {/* Premium Data Table Container */}
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
                  <th className="py-4 px-6">تاريخ التقديم</th>
                  <th className="py-4 px-6">الطالب(ة)</th>
                  <th className="py-4 px-6">رقم وسنة البكالوريا</th>
                  <th className="py-4 px-6">نوع الخدمة</th>
                  <th className="py-4 px-6">تغيير حالة الطلب</th>
                  <th className="py-4 px-6">البريد الإلكتروني</th>
                  <th className="py-4 px-6 text-center">الربط والوثيقة</th>
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
                      <FileText size={44} className="mx-auto mb-3 opacity-30 text-slate-500" />
                      <p className="text-base font-bold text-slate-600">لا توجد طلبات جارية مطابقة للبحث حالياً</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.filter(Boolean).map((record) => (
                    <tr key={record?.id || Math.random()} className={`transition-colors ${record?.status === 'جديد' || record?.status === 'لم ينظر فيه' ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'}`}>
                      
                      {/* Submission Date */}
                      <td className="py-4 px-6 text-slate-500 text-xs font-mono">
                        {record?.created_at ? new Date(record.created_at).toLocaleDateString('ar-DZ', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>

                      {/* Student Name (Clickable to open details modal) */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(record)}
                          className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-right flex items-center gap-1.5 group cursor-pointer"
                        >
                          <span className="group-hover:underline">{record?.last_name || ''} {record?.first_name || ''}</span>
                          {(record?.status === 'جديد' || record?.status === 'لم ينظر فيه') && (
                            <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full inline-block shadow-2xs">
                              جديد
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Bac Registration & Year */}
                      <td className="py-4 px-6 font-mono text-emerald-800 font-bold whitespace-nowrap">
                        {record?.registration_number || '-'}
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block ms-2 border border-slate-200/60">
                          دفعة {record?.bac_year || '-'}
                        </span>
                      </td>

                      {/* Request Domain */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          record?.request_domain === 'إيواء' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' :
                          record?.request_domain === 'تغيير الإقامة' ? 'bg-blue-50 text-blue-700 border border-blue-200/80' : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}>
                          {record?.request_domain || '-'}
                        </span>
                      </td>

                      {/* Dynamic Status Dropdown Selector */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={record?.status || 'جديد'}
                            disabled={updatingId === record?.id}
                            onChange={(e) => record?.id && handleStatusChange(record.id, e.target.value)}
                            className={`font-extrabold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 cursor-pointer border transition-all shadow-2xs disabled:opacity-50 ${
                              record?.status === 'جديد' || record?.status === 'لم ينظر فيه' 
                                ? 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500 animate-pulse'
                                : record?.status === 'قيد المعالجة' || record?.status === 'قيد الدراسة'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200 focus:ring-blue-500'
                                  : record?.status === 'مرفوض'
                                    ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500'
                            }`}
                          >
                            <option value="جديد">🟡 جديد (لم يُنظر فيه)</option>
                            <option value="قيد المعالجة">🔵 قيد المعالجة</option>
                            <option value="مكتمل">🟢 مكتمل (نقل للأرشيف)</option>
                            <option value="مرفوض">🔴 مرفوض</option>
                          </select>
                          {updatingId === record?.id && (
                            <div className="absolute right-2 top-2 w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 font-mono text-xs text-slate-600 dir-ltr text-right">
                        {record?.email || '-'}
                      </td>

                      {/* View Details Modal & Download Actions (Icon Only) */}
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

                          {/* Download PDF Button */}
                          {record?.pdf_file_path && (
                            <button
                              onClick={() => handleDownloadPDF(record)}
                              disabled={downloadingId === record.id}
                              className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl transition-all border border-emerald-200/90 active:scale-95 disabled:opacity-50 shadow-2xs shrink-0"
                              title="تحميل وثيقة PDF المرفقة"
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination Controls */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
            
            <div className="flex items-center gap-4">
              <span>
                عرض {filteredRequests.length > 0 ? startIndex + 1 : 0} إلى {Math.min(endIndex, filteredRequests.length)} من إجمالي <strong className="text-slate-800 font-bold">{filteredRequests.length}</strong> طلب جارٍ
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

      {/* Full Request Details Popup Modal */}
      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
