import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  BarChart3, PieChart, TrendingUp, Home, RefreshCw, Wallet, 
  Stethoscope, MapPin, Accessibility, FileText, Users, AlertTriangle, 
  CheckCircle2, Printer, Sparkles, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminNavbar } from '../components/AdminNavbar';

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

export const AdminAnalytics: React.FC = () => {
  const [requests, setRequests] = useState<HousingRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('housing_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'فشل في جلب بيانات الإحصائيات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Analytics Computation
  const metrics = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    const total = list.length;

    const housing = list.filter(r => r?.request_domain === 'إيواء').length;
    const transfer = list.filter(r => r?.request_domain === 'تغيير الإقامة').length;
    const settlement = list.filter(r => r?.request_domain === 'تسوية دفع حقوق الإيواء').length;

    const housingDocs = {
      residence: list.filter(r => r?.housing_doc_type === 'إقامة').length,
      distance: list.filter(r => r?.housing_doc_type === 'مسافة').length,
      medical: list.filter(r => r?.housing_doc_type === 'طبي').length,
      needs: list.filter(r => r?.housing_doc_type === 'احتياجات').length,
    };

    const transferReasons = {
      sibling: list.filter(r => r?.transfer_reason === 'أخوة').length,
      medical: list.filter(r => r?.transfer_reason === 'مرض').length,
      needs: list.filter(r => r?.transfer_reason === 'احتياجات').length,
    };

    const priorityMedicalCases = 
      list.filter(r => r?.housing_doc_type === 'طبي' || r?.transfer_reason === 'مرض').length;
    const prioritySpecialNeedsCases = 
      list.filter(r => r?.housing_doc_type === 'احتياجات' || r?.transfer_reason === 'احتياجات').length;

    const bacYearsMap: Record<string, number> = {};
    list.forEach(r => {
      if (r?.bac_year) {
        bacYearsMap[r.bac_year] = (bacYearsMap[r.bac_year] || 0) + 1;
      }
    });

    const sortedBacYears = Object.entries(bacYearsMap)
      .map(([year, count]) => ({ year, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => Number(b.year) - Number(a.year));

    const filesUploadedCount = list.filter(r => r?.pdf_file_path).length;
    const uploadRate = total > 0 ? Math.round((filesUploadedCount / total) * 100) : 0;

    return {
      total,
      housing,
      transfer,
      settlement,
      housingDocs,
      transferReasons,
      priorityMedicalCases,
      prioritySpecialNeedsCases,
      sortedBacYears,
      filesUploadedCount,
      uploadRate
    };
  }, [requests]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50/70 font-sans text-slate-900 selection:bg-emerald-200 pb-24 sm:pb-20">
      
      {/* Responsive Navbar & Mobile Bottom Dock */}
      <AdminNavbar
        title="مرصد الإحصائيات ودعم القرار"
        subtitle="مديرية الخدمات الجامعية معسكر - الإحصائيات التنفيذية"
        onRefresh={fetchRequests}
        isLoading={loading}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        
        {/* Sleek Hero Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-full border border-emerald-800/80 shadow-2xs">
              <Sparkles size={13} />
              لوحة البيانات التنفيذية 2026-2027
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">تقرير التحليل الشامل وتوزيع طلبات الإيواء</h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed font-normal">
              تحليل مباشر للبيانات المستلمة لمساعدة الإدارة على توزيع الأسرة، تجهيز غرف الحالات الخاصة، وتحديد أولوية السكن الجامعي.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 shadow-inner relative z-10">
            <button
              onClick={() => window.print()}
              className="hidden md:flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition-all border border-white/20 mb-2"
            >
              <Printer size={15} />
              طباعة التقرير
            </button>
            <div className="text-right">
              <span className="text-[11px] text-slate-300 font-semibold block">إجمالي الملفات المستلمة</span>
              <span className="text-3xl font-extrabold font-mono text-emerald-400 block mt-0.5">{metrics.total}</span>
            </div>
          </div>

          <div className="absolute left-0 bottom-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Top Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-emerald-500 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">معدل رفع الملفات PDF</span>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <FileText size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.uploadRate}%</div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000" style={{ width: `${metrics.uploadRate}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">{metrics.filesUploadedCount} من أصل {metrics.total} طالب أرفقوا وثائق مبررة</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-rose-500 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-600">الحالات الطبية والأولويات</span>
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-700 font-mono">{metrics.priorityMedicalCases}</div>
            <p className="text-xs text-rose-600 mt-3 font-semibold">تتطلب مراجعة الطبيب للترخيص بالهياكل الخاصة</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-indigo-500 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-600">ذوو الاحتياجات الخاصة</span>
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Accessibility size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-indigo-700 font-mono">{metrics.prioritySpecialNeedsCases}</div>
            <p className="text-xs text-indigo-600 mt-3 font-semibold">تتطلب تخصيص غرف بالدور الأرضي</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 border-t-4 border-t-amber-500 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-600">دفعة البكالوريا الأكثر طلباً</span>
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Building2 size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {metrics.sortedBacYears[0]?.year ? `دفعة ${metrics.sortedBacYears[0]?.year}` : '-'}
            </div>
            <p className="text-xs text-amber-700 mt-3 font-semibold">
              تستحوذ على {metrics.sortedBacYears[0]?.percentage || 0}% من إجمالي الطلبات المستلمة
            </p>
          </motion.div>

        </div>

        {/* Charts & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Distribution by Service Domain */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChart className="text-emerald-600" size={20} />
                  توزيع الطلبات حسب نوع الخدمة المطلوبة
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">مقارنة النسب المئوية بين خدمات الإيواء والتغيير والتسوية</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-800 flex items-center gap-1.5"><Home size={14} /> طلب خدمة الإيواء</span>
                  <span className="font-mono text-slate-700">{metrics.housing} طلب ({metrics.total > 0 ? Math.round((metrics.housing / metrics.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700" style={{ width: `${metrics.total > 0 ? (metrics.housing / metrics.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-blue-800 flex items-center gap-1.5"><RefreshCw size={14} /> طلب تغيير الإقامة</span>
                  <span className="font-mono text-slate-700">{metrics.transfer} طلب ({metrics.total > 0 ? Math.round((metrics.transfer / metrics.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-l from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-700" style={{ width: `${metrics.total > 0 ? (metrics.transfer / metrics.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-amber-800 flex items-center gap-1.5"><Wallet size={14} /> تسوية دفع الحقوق</span>
                  <span className="font-mono text-slate-700">{metrics.settlement} طلب ({metrics.total > 0 ? Math.round((metrics.settlement / metrics.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-l from-amber-500 to-orange-400 h-full rounded-full transition-all duration-700" style={{ width: `${metrics.total > 0 ? (metrics.settlement / metrics.total) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-around text-center">
              <div>
                <span className="text-xs text-slate-500 block font-medium">الإيواء</span>
                <span className="text-lg font-bold text-emerald-600 font-mono">{metrics.housing}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">التغيير</span>
                <span className="text-lg font-bold text-blue-600 font-mono">{metrics.transfer}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">التسوية</span>
                <span className="text-lg font-bold text-amber-600 font-mono">{metrics.settlement}</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Housing Document Justification Breakdown */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  طبيعة الوثائق المبررة المرفقة لطلبات الإيواء
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">تحليل أنواع المستندات المرفقة للتعرف على الأولويات</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <FileText size={14} className="text-slate-600" /> إثبات الإقامة
                </span>
                <span className="text-2xl font-extrabold text-slate-800 font-mono block">{metrics.housingDocs.residence}</span>
                <span className="text-xs text-slate-400 block font-mono">حالة إقامة عادية</span>
              </div>

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <MapPin size={14} className="text-blue-600" /> شهادة المسافة
                </span>
                <span className="text-2xl font-extrabold text-blue-700 font-mono block">{metrics.housingDocs.distance}</span>
                <span className="text-xs text-blue-500 block font-mono">أولوية السكن البعيد</span>
              </div>

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Stethoscope size={14} className="text-rose-600" /> ملف طبي
                </span>
                <span className="text-2xl font-extrabold text-rose-700 font-mono block">{metrics.housingDocs.medical}</span>
                <span className="text-xs text-rose-500 block font-mono">حالات صحية خاصة</span>
              </div>

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Accessibility size={14} className="text-indigo-600" /> بطاقة احتياجات
                </span>
                <span className="text-2xl font-extrabold text-indigo-700 font-mono block">{metrics.housingDocs.needs}</span>
                <span className="text-xs text-indigo-500 block font-mono">غرف الدور الأرضي</span>
              </div>

            </div>

            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 text-xs text-blue-800 font-medium">
              <strong>تنبيه:</strong> تشكل طلبات المسافة والملفات الطبية النسبة الأكبر التي تتطلب التحقق المباشر من صحة وثائق PDF قبل منح قرارات التخصيص النهائي.
            </div>
          </div>

        </div>

        {/* Executive Decision Support Recommendations Engine */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-900/60 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-emerald-400 border border-white/10 shrink-0 shadow-inner">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">لوحة التوصيات التلقائية لاتخاذ القرار (Executive Decision Support)</h3>
              <p className="text-emerald-200 text-xs mt-0.5 font-normal">توصيات ذكية مبنية على تحليل قاعدة البيانات الحالية لمديرية الخدمات معسكر</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                توزيع أسرة الإيواء العام
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                تم تسجيل <strong className="text-white font-bold">{metrics.housing} طلب إيواء جديد</strong>. يُوصى ببدء تخصيص الأجنحة للإقامات الأكثر استيعاباً لطلبة دفعة {metrics.sortedBacYears[0]?.year || '2026'}.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle size={16} />
                تجهيز الأجنحة الطبية
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                يوجد <strong className="text-white font-bold">{metrics.priorityMedicalCases + metrics.prioritySpecialNeedsCases} حالة خاصة وتغطية طبية</strong>. يُنصح بحجز الغرف القريبة من الوحدات الصحية والمداخل الرئيسية.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                <Users size={16} />
                طلبات الأخوة والتغيير
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                تم تقديم <strong className="text-white font-bold">{metrics.transferReasons.sibling} طلب لم شمل الأخوة</strong>. يُمكّن ذلك من تحسين استغلال الغرف الثنائية عبر دمج الإخوة بنفس الإقامة.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};
