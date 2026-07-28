import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Mail, Save, CheckCircle2, Info, Sparkles, Send, 
  RotateCcw, Tag, FileText, Code
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminNavbar } from '../components/AdminNavbar';

export const AdminEmailTemplate: React.FC = () => {
  const [subject, setSubject] = useState('تأكيد استلام طلب الخدمة الجامعية - مديرية الخدمات معسكر');
  const [templateText, setTemplateText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test Email Sending State
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const navigate = useNavigate();

  const DEFAULT_TEMPLATE = `مرحباً الطالب(ة) {first_name} {last_name}،

تم استلام طلبكم الخاص بـ "{request_domain}" بنجاح لدى مديرية الخدمات الجامعية معسكر.
رقم التسجيل: {registration_number}
سنة البكالوريا: {bac_year}

نحيطكم علماً أن ملفكم في طور الدراسة والمعالجة من طرف مصلحة الإيواء، وسيتم مراسلتكم فور اتخاذ القرار النهائي.

شكراً لتواصلكم معنا.
مديرية الخدمات الجامعية معسكر - مصلحة الإيواء`;

  const fetchTemplateSettings = async () => {
    setLoading(true);
    try {
      const { data: templateData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'email_template')
        .single();

      if (templateData?.value) {
        setTemplateText(templateData.value);
      } else {
        setTemplateText(DEFAULT_TEMPLATE);
      }

      const { data: subjectData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'email_subject')
        .single();

      if (subjectData?.value) {
        setSubject(subjectData.value);
      }
    } catch (e) {
      console.warn('Error fetching email template settings:', e);
      setTemplateText(DEFAULT_TEMPLATE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplateSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error: errTemplate } = await supabase
        .from('system_settings')
        .upsert({ key: 'email_template', value: templateText || DEFAULT_TEMPLATE, updated_at: new Date().toISOString() });

      if (errTemplate) throw errTemplate;

      const { error: errSubject } = await supabase
        .from('system_settings')
        .upsert({ key: 'email_subject', value: subject || '', updated_at: new Date().toISOString() });

      if (errSubject) throw errSubject;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving email settings:', err);
      alert(`فشل حفظ إعدادات البريد: ${err.message || 'يرجى التحقق من صلاحيات الأمان'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('هل أنت تأكد من إرجاع نص الرسالة إلى القالب الافتراضي الأولي؟')) {
      setTemplateText(DEFAULT_TEMPLATE);
      setSubject('تأكيد استلام طلب الخدمة الجامعية - مديرية الخدمات معسكر');
    }
  };

  const insertVariable = (variableTag: string) => {
    setTemplateText(prev => (prev || '') + ' ' + variableTag);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('يرجى كتابة بريد إلكتروني صحيح لإرسال التجربة.');
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testEmail.trim(),
          firstName: 'عبد الرحمن',
          lastName: 'الأحمدي',
          registrationNumber: '39012345',
          bacYear: '2026',
          requestDomain: 'طلب خدمة الإيواء',
          templateText: templateText || DEFAULT_TEMPLATE,
          subject: subject
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال البريد التجريبي');

      setTestResult({
        success: true,
        message: 'تم إرسال البريد التجريبي الحقيقي عبر Resend بنجاح! يرجى فحص صندوق الوارد.'
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'فشل في الاتصال بخدمة البريد'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const smartVariables = [
    { tag: '{first_name}', label: 'اسم الطالب', desc: 'يستبدل بالاسم الشخصي للطالب', color: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100/80' },
    { tag: '{last_name}', label: 'اللقب العائلي', desc: 'يستبدل باللقب العائلي للطالب', color: 'bg-blue-50/80 text-blue-800 border-blue-200/90 hover:bg-blue-100/80' },
    { tag: '{registration_number}', label: 'رقم التسجيل', desc: 'رقم تسجيل البكالوريا الخاص بالطالب', color: 'bg-amber-50/80 text-amber-800 border-amber-200/90 hover:bg-amber-100/80' },
    { tag: '{bac_year}', label: 'سنة البكالوريا', desc: 'سنة حصول الطالب على البكالوريا', color: 'bg-purple-50/80 text-purple-800 border-purple-200/90 hover:bg-purple-100/80' },
    { tag: '{request_domain}', label: 'نوع الخدمة', desc: 'الخدمة المطلوبة (إيواء، تغيير إقامة، تسوية)', color: 'bg-indigo-50/80 text-indigo-800 border-indigo-200/90 hover:bg-indigo-100/80' },
  ];

  const safeText = templateText || '';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50/70 font-sans text-slate-900 selection:bg-emerald-200 pb-24 sm:pb-20">
      
      {/* Responsive Navbar & Mobile Bottom Dock */}
      <AdminNavbar
        title="استوديو البريد (Resend)"
        subtitle="مديرية الخدمات الجامعية معسكر - تخصيص المراسلات"
        isLoading={loading}
      />

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        
        {/* Sleek Hero Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300 bg-blue-950/90 px-3 py-1 rounded-full border border-blue-800/80 shadow-2xs">
              <Sparkles size={13} />
              منظومة المراسلات التلقائية للطلاب
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">استوديو صياغة رسائل التأكيد (Resend Integration)</h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed font-normal">
              قم بصياغة نص الرسالة التي ستصل تلقائياً إلى البريد الإلكتروني لكل طالب فور إتمامه لعملية التسجيل. استخدم العناصر التفاعلية لإضافة البيانات الشخصية ديناميكياً.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto relative z-10">
            <button
              onClick={handleResetDefault}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs py-3 px-4 rounded-2xl transition-all border border-white/20 flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              الافتراضي
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm py-3 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={17} />
                  حفظ التعديلات
                </>
              )}
            </button>
          </div>

          <div className="absolute left-0 bottom-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {saveSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold p-4 rounded-2xl flex items-center gap-3 shadow-xs">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>تم حفظ القالب وعنوان الرسالة بنجاح في قاعدة البيانات! ستتلقى الطلبات الجديدة هذا القالب فوراً.</span>
          </motion.div>
        )}

        {/* Full-Width Form Workspace */}
        <div className="space-y-6">
          
          {/* Subject Line Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag size={18} className="text-blue-600" />
              عنوان البريد الإلكتروني (Email Subject Line)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="أدخل عنوان الرسالة..."
              className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-4 text-slate-800 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <p className="text-xs text-slate-400">هذا هو العنوان الذي سيظهر للطالب في صندوق الوارد (Inbox).</p>
          </div>

          {/* Smart Interactive Dynamic Variables Palette */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Code size={18} className="text-emerald-600" />
                مكعبات البيانات التفاعلية (Dynamic Smart Chips)
              </h3>
              <span className="text-xs text-slate-400 font-medium">انقر لإدراج العنصر بالنص</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {smartVariables.map((v) => (
                <button
                  key={v.tag}
                  onClick={() => insertVariable(v.tag)}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between group active:scale-95 cursor-pointer shadow-2xs ${v.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs flex items-center gap-1.5">
                      <Sparkles size={13} />
                      {v.label}
                    </span>
                    <span className="font-mono text-[11px] opacity-80 bg-white px-2 py-0.5 rounded-md border border-black/5 font-bold">
                      {v.tag}
                    </span>
                  </div>
                  <p className="text-xs opacity-85 mt-2">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Text Template Editor */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-slate-700" />
                نص الرسالة الترحيبية (Email Body Content)
              </label>
              <span className="text-xs font-mono text-slate-400">
                {safeText.length} حرف | {safeText.split(/\s+/).filter(Boolean).length} كلمة
              </span>
            </div>

            <textarea
              rows={14}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-5 text-slate-800 text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              placeholder="اكتب نص الرسالة هنا..."
            />
          </div>

          {/* Real Live Resend Test Email Dispatcher */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Send size={18} className="text-blue-600" />
              اختبار الإرسال المباشر (Resend Test Dispatcher)
            </h3>
            <p className="text-xs text-slate-500">أدخل بريدك الإلكتروني الشخصي لإرسال رسالة تجريبية مخصصة ومعاينتها مباشرة بنفسك.</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                dir="ltr"
                placeholder="name@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={testingEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shrink-0"
              >
                {testingEmail ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={14} />
                    إرسال تجربة الآن
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2 border ${testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
};
