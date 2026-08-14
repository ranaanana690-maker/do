import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Home, RefreshCw, MapPin, Stethoscope, Map, 
  CheckCircle2, Sparkles, ArrowLeft, Upload, Mail, Users, HeartPulse, Accessibility, FileText, AlertCircle, Wallet, Info
} from 'lucide-react';

type BacYear = string;
type RequestDomain = 'إيواء' | 'تغيير الإقامة' | 'تسوية دفع حقوق الإيواء' | '';
type HousingDocType = 'إقامة' | 'مسافة' | 'طبي' | 'احتياجات' | '';
type TransferReason = 'أخوة' | 'مرض' | 'احتياجات' | '';

interface FormData {
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  bacYear: BacYear;
  registrationNumber: string;
  requestDomain: RequestDomain;
  housingDocType: HousingDocType;
  transferReason: TransferReason;
  siblingName: string;
  emailPrefix: string;
  fileUploaded: boolean;
  fileName: string;
  fileError: string;
}

const BAC_YEARS = Array.from({ length: 30 }, (_, i) => (2026 - i).toString());

const ShimmerLine = ({ width = "w-full", height = "h-4", className = "" }: { width?: string, height?: string, className?: string }) => (
  <div className={`${height} ${width} bg-slate-200 rounded-md relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

const DomainCard = ({ 
  title, subtext, icon: Icon, selected, onClick 
}: {
  title: string; subtext?: string; icon: any; selected: boolean; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 w-full text-center select-none active:scale-95 [-webkit-tap-highlight-color:transparent]
      ${selected 
        ? 'border-emerald-600 bg-emerald-50/80 shadow-md transform scale-[1.02]' 
        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
      }
    `}
  >
    <Icon className={`mb-3 transition-colors ${selected ? 'text-emerald-600' : 'text-slate-400'}`} size={32} strokeWidth={1.5} />
    <span className={`font-semibold transition-colors ${selected ? 'text-emerald-900' : 'text-slate-700'}`}>{title}</span>
    {subtext && <span className="text-xs text-slate-500 mt-2">{subtext}</span>}
    
    {selected && (
      <motion.div 
        layoutId="outline"
        className="absolute inset-0 border-2 border-emerald-600 rounded-2xl pointer-events-none"
        initial={false}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
);

const ValidIndicator = ({ isValid, className = "" }: { isValid: boolean, className?: string }) => (
  <AnimatePresence>
    {isValid && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className={`text-emerald-500 ${className}`}
      >
        <CheckCircle2 size={16} strokeWidth={3} />
      </motion.div>
    )}
  </AnimatePresence>
);

const ErrorText = ({ message }: { message: string | false | null | undefined }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, height: 0, marginTop: 0 }}
        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        className="text-red-500 text-xs font-semibold flex items-center gap-1.5 overflow-hidden"
      >
        <AlertCircle size={14} />
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

const isArabicOnly = (str: string) => /^[\u0600-\u06FF\s]+$/.test(str);
const hasNoArabicCharacters = (str: string) => !/[\u0600-\u06FF]/.test(str);

const STORAGE_KEY = 'bac_form_draft_v1';

export default function App() {
  const [view, setView] = useState<'splash' | 'form'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).view : 'splash';
  });
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).currentStep : 1;
  });
  const [status, setStatus] = useState<'filling' | 'submitting' | 'success'>('filling');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved).formData;
    }
    return {
      firstName: '',
      lastName: '',
      dobDay: '',
      dobMonth: '',
      dobYear: '',
      bacYear: '',
      registrationNumber: '',
      requestDomain: '',
      housingDocType: '',
      transferReason: '',
      siblingName: '',
      emailPrefix: '',
      fileUploaded: false,
      fileName: '',
      fileError: ''
    };
  });

  useEffect(() => {
    if (status !== 'success') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, currentStep, formData }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [view, currentStep, formData, status]);

  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);
  
  const firstNameRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const bacYearRef = useRef<HTMLSelectElement>(null);
  const regNumRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const updateForm = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const playSuccessFeedback = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playNote = (freq: number, startTime: number, duration: number, vol = 0.3) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(vol, startTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.start(startTime); osc.stop(startTime + duration);
        };
        const now = ctx.currentTime;
        playNote(523.25, now, 0.3); playNote(659.25, now + 0.1, 0.3);
        playNote(783.99, now + 0.2, 0.3); playNote(1046.50, now + 0.3, 0.8, 0.5);
      }
    } catch (e) {
      console.log('Audio API not supported', e);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50, 50, 50, 50, 200]);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#34d399', '#ffffff'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#34d399', '#ffffff'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    if (status === 'success') { playSuccessFeedback(); triggerConfetti(); }
  }, [status]);

  useEffect(() => {
    if (status !== 'filling' || view !== 'form') return;
    const refs: Record<number, React.RefObject<HTMLDivElement | null>> = {
      1: step1Ref, 2: step2Ref, 3: step3Ref, 4: submitRef
    };
    const currentRef = refs[currentStep];
    if (currentRef && currentRef.current) {
      setTimeout(() => { currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    }
  }, [currentStep, status, view]);

  const handleNextStep = (nextStep: number) => {
    setCurrentStep(nextStep);
    
    // Smart auto-focus: Focus the first input of the newly opened step
    setTimeout(() => {
      if (nextStep === 2) {
        bacYearRef.current?.focus();
      } else if (nextStep === 3) {
        emailRef.current?.focus();
      }
    }, 350); // slight delay to allow scroll animation to finish
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setStatus('submitting');
    
    try {
      let pdfFilePath = '';
      let pdfFileName = '';

      // 1. Upload PDF to Cloudflare R2 (Direct Presigned Upload -> Proxy Upload -> Supabase Fallback)
      if (selectedFile) {
        pdfFileName = selectedFile.name;
        let uploadSucceeded = false;
        
        // Method A: Direct Presigned Upload to R2 (Best for Vercel, fastest, bypasses body limits)
        try {
          const urlParams = new URLSearchParams({
            fileName: selectedFile.name,
            mimeType: selectedFile.type || 'application/pdf',
            registrationNumber: formData.registrationNumber.trim()
          });

          const presignedRes = await fetch(`/api/r2/upload-url?${urlParams.toString()}`);
          if (presignedRes.ok) {
            const presignedData = await presignedRes.json();
            if (presignedData.uploadUrl) {
              const directPutRes = await fetch(presignedData.uploadUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': selectedFile.type || 'application/pdf',
                },
                body: selectedFile
              });

              if (directPutRes.ok) {
                pdfFilePath = presignedData.key;
                pdfFileName = presignedData.fileName || selectedFile.name;
                uploadSucceeded = true;
                console.log('[R2 Direct Upload Success]:', pdfFilePath);
              }
            }
          }
        } catch (directErr) {
          console.warn('Direct R2 presigned upload notice, trying method B:', directErr);
        }

        // Method B: Server Endpoint Upload
        if (!uploadSucceeded) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', selectedFile);
            uploadFormData.append('registrationNumber', formData.registrationNumber.trim());

            const r2Res = await fetch('/api/r2/upload', {
              method: 'POST',
              body: uploadFormData,
            });

            if (r2Res.ok) {
              const r2Data = await r2Res.json();
              pdfFilePath = r2Data.key;
              pdfFileName = r2Data.fileName || selectedFile.name;
              uploadSucceeded = true;
            }
          } catch (r2Err) {
            console.warn('R2 proxy upload notice, trying Supabase Storage fallback:', r2Err);
          }
        }

        // Method C: Fallback to Supabase Storage if R2 is unavailable
        if (!uploadSucceeded) {
          try {
            pdfFilePath = `${Date.now()}_${crypto.randomUUID()}_${formData.registrationNumber}.pdf`;
            const { error: uploadError } = await supabase.storage
              .from('housing_pdfs')
              .upload(pdfFilePath, selectedFile, {
                contentType: 'application/pdf',
                upsert: false,
              });

            if (uploadError) {
              console.warn('Supabase storage upload warning:', uploadError);
            }
          } catch (sbStorageErr) {
            console.warn('Supabase storage exception:', sbStorageErr);
          }
        }
      }

      // 2. Insert Record into Supabase Database Table
      const fullEmail = `${formData.emailPrefix.trim()}@gmail.com`;
      const { error: dbError } = await supabase
        .from('housing_requests')
        .insert([
          {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            dob_day: formData.dobDay,
            dob_month: formData.dobMonth,
            dob_year: formData.dobYear,
            bac_year: formData.bacYear,
            registration_number: formData.registrationNumber.trim(),
            request_domain: formData.requestDomain,
            housing_doc_type: formData.housingDocType || null,
            transfer_reason: formData.transferReason || null,
            sibling_name: formData.siblingName ? formData.siblingName.trim() : null,
            email: fullEmail,
            pdf_file_path: pdfFilePath,
            pdf_file_name: pdfFileName,
            status: 'جديد'
          }
        ]);

      if (dbError) {
        console.warn('Supabase database insert warning:', dbError);
      }

      // 3. Send Confirmation Email via Brevo API using custom Supabase Template
      try {
        let customTemplate = '';
        const { data: settingData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'email_template')
          .single();

        if (settingData?.value) {
          customTemplate = settingData.value;
        }

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: fullEmail,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            registrationNumber: formData.registrationNumber.trim(),
            bacYear: formData.bacYear,
            requestDomain: formData.requestDomain,
            templateText: customTemplate
          })
        });
      } catch (emailErr) {
        console.warn('Confirmation email dispatch notice:', emailErr);
      }

      // 4. Submit to n8n Webhook Proxy as parallel/backup mechanism
      try {
        const url = '/api/submit';
        const formPayload = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          formPayload.append(key, String(value));
        });
        formPayload.append('email', fullEmail);
        formPayload.append('submissionDate', new Date().toISOString());
        if (selectedFile) {
          formPayload.append('file', selectedFile);
        }

        await fetch(url, {
          method: 'POST',
          body: formPayload
        });
      } catch (n8nErr) {
        console.warn('n8n submission proxy notice:', n8nErr);
      }

      setStatus('success');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert('عذراً، حدث خطأ أثناء إرسال البيانات. يرجى المحاولة مرة أخرى.');
      setStatus('filling');
    }
  };

  let dobError = '';
  const d = parseInt(formData.dobDay, 10);
  const m = parseInt(formData.dobMonth, 10);
  const y = parseInt(formData.dobYear, 10);

  if (formData.dobYear.length === 4) {
    if (y < 1950) dobError = 'عذراً، السن غير صالح.';
    else if (y > 2011) dobError = 'تاريخ الميلاد غير متوافق (أصغر من السن القانوني).';
  }
  if (formData.dobMonth.length === 2 && (m < 1 || m > 12)) dobError = 'شهر غير صالح.';
  if (formData.dobDay.length === 2 && (d < 1 || d > 31)) dobError = 'يوم غير صالح.';

  const isDobValid = formData.dobDay.length === 2 && formData.dobMonth.length === 2 && formData.dobYear.length === 4 && !dobError;

  const isStep1Valid = formData.firstName.trim().length >= 2 && isArabicOnly(formData.firstName) && formData.lastName.trim().length >= 2 && isArabicOnly(formData.lastName) && isDobValid;
  const isStep2Valid = formData.bacYear !== '' && formData.registrationNumber.trim().length >= 8 && hasNoArabicCharacters(formData.registrationNumber);
  
  const isStep3Valid = () => {
    if (!formData.requestDomain) return false;
    if (formData.requestDomain === 'إيواء') {
      if (!formData.housingDocType) return false;
      if (!formData.fileUploaded) return false;
    }
    if (formData.requestDomain === 'تغيير الإقامة') {
      if (!formData.transferReason) return false;
      if (formData.transferReason === 'أخوة' && (formData.siblingName.trim().length < 3 || !isArabicOnly(formData.siblingName))) return false;
      if (formData.transferReason !== 'أخوة' && !formData.fileUploaded) return false;
    }
    if (formData.emailPrefix.trim().length < 3 || !hasNoArabicCharacters(formData.emailPrefix)) return false;
    return true;
  };

  const stepContainerClass = (stepNum: number) => `
    relative p-6 md:p-8 bg-white rounded-3xl border transition-all duration-700 ease-in-out
    ${currentStep === stepNum 
      ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 scale-100 z-10 opacity-100' 
      : currentStep > stepNum 
        ? 'border-slate-200 shadow-sm scale-[0.98] blur-[2px] opacity-50 grayscale-[10%] cursor-pointer hover:opacity-100 hover:blur-none' 
        : 'border-slate-100 opacity-30 pointer-events-none scale-95 blur-[4px] hidden md:block'}
  `;

  const highlightDay = currentStep === 1 && !formData.dobDay;
  const highlightMonth = currentStep === 1 && formData.dobDay && !formData.dobMonth;
  const highlightYear = currentStep === 1 && formData.dobDay && formData.dobMonth && !formData.dobYear;

  const needsFileUpload = 
    formData.requestDomain === 'إيواء' || 
    (formData.requestDomain === 'تغيير الإقامة' && (formData.transferReason === 'مرض' || formData.transferReason === 'احتياجات'));

  if (view === 'splash') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-900 selection:bg-emerald-200">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="max-w-md w-full text-center space-y-10"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-36 h-36 bg-white rounded-full shadow-sm border-2 border-slate-100 flex items-center justify-center mx-auto overflow-hidden p-4"
          >
            <img src="/logo.JPG" alt="مديرية الخدمات الجامعية معسكر" className="w-full h-full object-contain" />
          </motion.div>
          
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight"
            >
              ابدؤوا بثقة.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-sm mx-auto"
            >
              مرحباً بكم في منصة دراسة طلبات الإيواء، الموسم الجامعي 2026-2027
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <button 
              onClick={() => setView('form')}
              className="w-full bg-emerald-600 text-white font-bold text-xl py-4 px-8 rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center"
            >
              ابدأ خطوتك الأولى
              <ArrowLeft className="ms-3" size={24} />
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (status === 'submitting') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
            <Sparkles className="text-emerald-500 animate-pulse" size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-8">جاري إرسال طلبك...</h2>
          <div className="w-full space-y-5 mb-8">
            <ShimmerLine height="h-14" className="rounded-xl" />
            <ShimmerLine height="h-4" width="w-3/4" className="mx-auto" />
            <ShimmerLine height="h-4" width="w-1/2" className="mx-auto" />
          </div>
          <p className="text-sm text-slate-500 font-medium animate-pulse">يقوم النظام بتسجيل البيانات بشكل آمن...</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }} className="bg-white rounded-3xl shadow-2xl shadow-emerald-500/10 max-w-md w-full p-8 md:p-10 text-center border border-emerald-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-50" />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }} className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-inner">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-3 relative z-10 tracking-tight">
            {formData.firstName ? `اكتملت خطوتك الأولى يا ${formData.firstName}!` : 'لقد تم إرسال التسجيل بنجاح!'}
          </h2>
          <p className="text-slate-600 mb-6 leading-relaxed relative z-10">
            لقد تم إرسال ملفك في النظام بأمان. سيتم مراسلتك عبر البريد الإلكتروني <strong className="font-mono text-emerald-700">{formData.emailPrefix}@gmail.com</strong> خلال 24 ساعة لتأكيد الطلب.
          </p>
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-100 shadow-sm text-sm text-slate-700 space-y-3 mb-6 text-start relative z-10">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">رقم التسجيل:</span>
              <span className="font-medium font-mono text-slate-800">{formData.registrationNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">الاسم واللقب:</span>
              <span className="font-medium text-slate-800">{formData.lastName} {formData.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">نوع الطلب:</span>
              <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {formData.requestDomain}
              </span>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm font-medium relative z-10 mb-6 text-right">
            <strong>ملاحظة:</strong> يرجى عدم إعادة التسجيل مرة ثانية إلا بعد انقضاء 24 ساعة دون تلقي رسالة التأكيد على البريد الإلكتروني.
          </div>

          <button onClick={() => window.location.reload()} className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors relative z-10 px-6 py-2 rounded-full hover:bg-emerald-50">
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50/50 py-12 px-4 font-sans text-slate-900 overflow-x-hidden selection:bg-emerald-200">
      <div className="max-w-3xl mx-auto space-y-6 pb-32">
        <header className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center justify-center w-28 h-28 bg-white rounded-full shadow-sm border border-slate-100 overflow-hidden mb-6 p-2">
            <img src="/logo.JPG" alt="الشعار" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">بوابة دراسة طلبات الإيواء</h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-lg mx-auto">
            تحت إشراف مدير الخدمات الجامعية معسكر، <span className="font-bold text-slate-700">السيد درقاوي عبد الكريم</span>،<br />
            نضع بين أيديكم هذه المنصة الإلكترونية لاستقبال ومعالجة الطلبات الخاصة بمصلحة الإيواء بهدف تسهيل إجراءات الدخول الجامعي للموسم 2026-2027
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Personal Info */}
          <div ref={step1Ref} className={stepContainerClass(1)} onClick={() => currentStep > 1 && setCurrentStep(1)}>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm me-3 font-bold">1</span>
              من أنت؟ (المعلومات الشخصية)
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-slate-700">اللقب (العائلي)</label>
                    <ValidIndicator isValid={formData.lastName.trim().length >= 2 && isArabicOnly(formData.lastName)} />
                  </div>
                  <input type="text" placeholder="اللقب بالعربية" value={formData.lastName}
                    onChange={(e) => updateForm('lastName', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && formData.lastName.trim().length >= 2) { e.preventDefault(); firstNameRef.current?.focus(); } }}
                    className={`w-full bg-slate-50/50 border rounded-xl px-4 py-4 text-slate-800 focus:outline-none focus:ring-2 transition-all placeholder:text-sm ${formData.lastName.length > 0 && !isArabicOnly(formData.lastName) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                  />
                  <ErrorText message={formData.lastName.length > 0 && !isArabicOnly(formData.lastName) && 'الرجاء إدخال حروف عربية فقط'} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-slate-700">الاسم (الشخصي)</label>
                    <ValidIndicator isValid={formData.firstName.trim().length >= 2 && isArabicOnly(formData.firstName)} />
                  </div>
                  <input ref={firstNameRef} type="text" placeholder="الاسم بالعربية" value={formData.firstName}
                    onChange={(e) => updateForm('firstName', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && formData.firstName.trim().length >= 2) { e.preventDefault(); dayRef.current?.focus(); } }}
                    className={`w-full bg-slate-50/50 border rounded-xl px-4 py-4 text-slate-800 focus:outline-none focus:ring-2 transition-all placeholder:text-sm ${formData.firstName.length > 0 && !isArabicOnly(formData.firstName) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                  />
                  <ErrorText message={formData.firstName.length > 0 && !isArabicOnly(formData.firstName) && 'الرجاء إدخال حروف عربية فقط'} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-semibold text-slate-700">تاريخ الميلاد</label>
                  <ValidIndicator isValid={isDobValid} />
                </div>
                <div className="flex gap-3 mt-2" dir="rtl">
                  <div className="flex-1 relative">
                    <label className="block text-xs font-medium text-slate-500 mb-1 text-center">اليوم</label>
                    <input ref={dayRef} type="text" inputMode="numeric" dir="ltr" placeholder="DD" value={formData.dobDay}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                        updateForm('dobDay', val);
                        if (val.length === 2) {
                          if (!formData.dobMonth) monthRef.current?.focus();
                          else if (!formData.dobYear) yearRef.current?.focus();
                        }
                      }}
                      className={`w-full bg-slate-50/50 border rounded-xl px-2 py-3.5 text-slate-800 text-lg text-center font-mono focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${dobError ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/30' : highlightDay ? 'border-emerald-400 ring-4 ring-emerald-500/10 bg-emerald-50/40' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <label className="block text-xs font-medium text-slate-500 mb-1 text-center">الشهر</label>
                    <input ref={monthRef} type="text" inputMode="numeric" dir="ltr" placeholder="MM" value={formData.dobMonth}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                        updateForm('dobMonth', val);
                        if (val.length === 2) {
                          if (!formData.dobYear) yearRef.current?.focus();
                          else if (!formData.dobDay) dayRef.current?.focus();
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Backspace' && !formData.dobMonth) dayRef.current?.focus(); }}
                      className={`w-full bg-slate-50/50 border rounded-xl px-2 py-3.5 text-slate-800 text-lg text-center font-mono focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${dobError ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/30' : highlightMonth ? 'border-emerald-400 ring-4 ring-emerald-500/10 bg-emerald-50/40' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                    />
                  </div>
                  <div className="flex-[1.5] relative">
                    <label className="block text-xs font-medium text-slate-500 mb-1 text-center">السنة</label>
                    <input ref={yearRef} type="text" inputMode="numeric" dir="ltr" placeholder="YYYY" value={formData.dobYear}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        updateForm('dobYear', val);
                        if (val.length === 4) {
                          if (!formData.dobMonth) monthRef.current?.focus();
                          else if (!formData.dobDay) dayRef.current?.focus();
                          else if (isStep1Valid) handleNextStep(2);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !formData.dobYear) monthRef.current?.focus();
                        if (e.key === 'Enter' && isStep1Valid) { e.preventDefault(); handleNextStep(2); }
                      }}
                      className={`w-full bg-slate-50/50 border rounded-xl px-2 py-3.5 text-slate-800 text-lg text-center font-mono focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${dobError ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/30' : highlightYear ? 'border-emerald-400 ring-4 ring-emerald-500/10 bg-emerald-50/40' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {dobError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center text-red-500 text-sm mt-3 font-semibold">
                      <AlertCircle size={16} className="me-1.5" /> {dobError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {currentStep === 1 && isStep1Valid && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 flex justify-center">
                    <button type="button" onClick={() => handleNextStep(2)} className="w-full md:w-auto md:min-w-[280px] bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center shadow-md">
                      مواصلة الرحلة <ArrowLeft className="ms-3 opacity-70" size={18} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 2: Bac Info */}
          {(currentStep >= 2 || isStep1Valid) && (
            <div ref={step2Ref} className={stepContainerClass(2)} onClick={() => currentStep > 2 && setCurrentStep(2)}>
              <div className="mb-6 border-b border-slate-100 pb-5">
                <h3 className="text-xl font-bold text-slate-800 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm me-3 font-bold">2</span>
                  {formData.firstName ? `أهلاً بك يا ${formData.firstName}. دعنا نكمل بيانات البكالوريا` : 'معلومات البكالوريا'}
                </h3>
                {formData.firstName && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-500 mt-2 ms-11">
                    خطوتك الأولى تمت بنجاح. الآن نحتاج لبعض التفاصيل الأكاديمية.
                  </motion.p>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-slate-700">سنة الحصول على البكالوريا</label>
                    <ValidIndicator isValid={formData.bacYear !== ''} />
                  </div>
                  <select 
                    ref={bacYearRef}
                    value={formData.bacYear}
                    onChange={(e) => {
                      updateForm('bacYear', e.target.value);
                      updateForm('requestDomain', '');
                      regNumRef.current?.focus();
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && formData.bacYear) { e.preventDefault(); regNumRef.current?.focus(); } }}
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-5 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none text-lg font-medium"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'left 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingLeft: '3rem' }}
                  >
                    <option value="" disabled>الرجاء الاختيار...</option>
                    {BAC_YEARS.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-slate-700">رقم التسجيل في البكالوريا</label>
                    <ValidIndicator isValid={formData.registrationNumber.trim().length >= 8 && hasNoArabicCharacters(formData.registrationNumber)} />
                  </div>
                  <input 
                    ref={regNumRef}
                    type="text" dir="ltr" placeholder="مثال: 39012345" value={formData.registrationNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateForm('registrationNumber', val);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && isStep2Valid) { e.preventDefault(); handleNextStep(3); } }}
                    className={`w-full bg-slate-50/50 border rounded-xl px-5 py-4 text-slate-800 font-mono text-lg tracking-wider text-left focus:outline-none focus:ring-2 transition-all ${formData.registrationNumber.length > 0 && !hasNoArabicCharacters(formData.registrationNumber) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                  />
                  <ErrorText message={formData.registrationNumber.length > 0 && !hasNoArabicCharacters(formData.registrationNumber) && 'الرجاء إدخال أرقام وحروف لاتينية فقط'} />
                  <ErrorText message={formData.registrationNumber.length > 0 && hasNoArabicCharacters(formData.registrationNumber) && formData.registrationNumber.trim().length < 8 && 'يجب أن يتكون رقم التسجيل من 8 أرقام أو حروف على الأقل'} />
                </div>
                <AnimatePresence>
                  {currentStep === 2 && isStep2Valid && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 flex justify-center">
                      <button type="button" onClick={() => handleNextStep(3)} className="w-full md:w-auto md:min-w-[280px] bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center shadow-md">
                        الخطوة الأخيرة <ArrowLeft className="ms-3 opacity-70" size={18} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Step 3: Domain specific */}
          {(currentStep >= 3 || isStep2Valid) && (
            <div ref={step3Ref} className={stepContainerClass(3)}>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm me-3 font-bold">3</span>
                ما هي الخدمة التي تبحث عنها؟
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <DomainCard 
                  title="طلب خدمة الإيواء"
                  icon={Home} selected={formData.requestDomain === 'إيواء'}
                  onClick={() => { updateForm('requestDomain', 'إيواء'); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }}
                />
                <DomainCard 
                  title="طلب تغيير الإقامة الجامعية"
                  icon={RefreshCw} selected={formData.requestDomain === 'تغيير الإقامة'}
                  onClick={() => { updateForm('requestDomain', 'تغيير الإقامة'); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }}
                />
                <DomainCard 
                  title="طلب تسوية دفع حقوق الإيواء"
                  icon={Wallet} selected={formData.requestDomain === 'تسوية دفع حقوق الإيواء'}
                  onClick={() => { updateForm('requestDomain', 'تسوية دفع حقوق الإيواء'); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }}
                />
              </div>

              <AnimatePresence mode="wait">
                {formData.requestDomain && (
                  <motion.div 
                    ref={detailsRef}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-8 bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-200"
                  >
                    
                    {/* Domain Specific Fields */}
                    {formData.requestDomain === 'إيواء' && (
                      <div>
                        <label className="block text-base font-bold text-slate-800 mb-4">اختر وثيقة مبررة واحدة:</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <DomainCard title="إثبات الحالة المبررة" icon={FileText} selected={formData.housingDocType === 'إقامة'} onClick={() => updateForm('housingDocType', 'إقامة')} />
                          <DomainCard title="شهادة المسافة" icon={MapPin} selected={formData.housingDocType === 'مسافة'} onClick={() => updateForm('housingDocType', 'مسافة')} />
                          <DomainCard title="ملف طبي" icon={Stethoscope} selected={formData.housingDocType === 'طبي'} onClick={() => updateForm('housingDocType', 'طبي')} />
                          <DomainCard title="بطاقة احتياجات" icon={Accessibility} selected={formData.housingDocType === 'احتياجات'} onClick={() => updateForm('housingDocType', 'احتياجات')} />
                        </div>
                      </div>
                    )}

                    {formData.requestDomain === 'تغيير الإقامة' && (
                      <div>
                        <label className="block text-base font-bold text-slate-800 mb-4">سبب طلب تغيير الإقامة:</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <DomainCard title="نفس الإقامة مع الأخ/الأخت" icon={Users} selected={formData.transferReason === 'أخوة'} onClick={() => updateForm('transferReason', 'أخوة')} />
                          <DomainCard title="حالة مرضية تتطلب مرافق" icon={HeartPulse} selected={formData.transferReason === 'مرض'} onClick={() => updateForm('transferReason', 'مرض')} />
                          <DomainCard title="احتياجات خاصة مع مرافق" icon={Accessibility} selected={formData.transferReason === 'احتياجات'} onClick={() => updateForm('transferReason', 'احتياجات')} />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-200/60 space-y-6">
                      
                      {/* For Sibling Transfer - text input instead of file */}
                      {formData.requestDomain === 'تغيير الإقامة' && formData.transferReason === 'أخوة' && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-semibold text-slate-700">اسم ولقب الأخ أو الأخت (الطالب المستضيف)</label>
                            <ValidIndicator isValid={formData.siblingName.trim().length >= 3 && isArabicOnly(formData.siblingName)} />
                          </div>
                          <input 
                            type="text" 
                            placeholder="الاسم الكامل للأخ أو الأخت" 
                            value={formData.siblingName}
                            onChange={(e) => updateForm('siblingName', e.target.value)}
                            className={`w-full bg-white border rounded-xl px-5 py-3.5 text-slate-800 focus:outline-none focus:ring-2 transition-all ${formData.siblingName.length > 0 && !isArabicOnly(formData.siblingName) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'}`}
                          />
                          <ErrorText message={formData.siblingName.length > 0 && !isArabicOnly(formData.siblingName) && 'الرجاء إدخال حروف عربية فقط'} />
                          <div className="mt-3 flex items-start gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-100/50">
                            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 font-medium leading-relaxed">
                              يكفي كتابة اسم الأخ أو الأخت الذي ترغب في الانتقال للإقامة معه للتأكد من السجلات.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Standard File Upload */}
                      {needsFileUpload && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            إرفاق الوثيقة المبررة (مطلوب)
                          </label>
                          <div className="relative">
                            <input 
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  const file = e.target.files[0];
                                  if (file.type !== 'application/pdf') {
                                    updateForm('fileError', 'عذراً، يُسمح فقط برفع ملفات بصيغة PDF.');
                                    updateForm('fileUploaded', false);
                                    updateForm('fileName', '');
                                    setSelectedFile(null);
                                  } else if (file.size > 5 * 1024 * 1024) {
                                    updateForm('fileError', 'عذراً، حجم الملف يتجاوز الحد الأقصى (5 ميجابايت).');
                                    updateForm('fileUploaded', false);
                                    updateForm('fileName', '');
                                    setSelectedFile(null);
                                  } else {
                                    updateForm('fileError', '');
                                    updateForm('fileUploaded', true);
                                    updateForm('fileName', file.name);
                                    setSelectedFile(file);
                                  }
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${formData.fileError ? 'border-red-400 bg-red-50' : formData.fileUploaded ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                              {formData.fileUploaded ? (
                                <>
                                  <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={36} />
                                  <p className="text-emerald-700 font-bold mb-1">تم إرفاق الوثيقة بنجاح</p>
                                  <p className="text-emerald-600 text-sm font-mono" dir="ltr">{formData.fileName}</p>
                                </>
                              ) : (
                                <>
                                  <Upload className={`mx-auto mb-3 ${formData.fileError ? 'text-red-400' : 'text-slate-400'}`} size={36} />
                                  <p className={`${formData.fileError ? 'text-red-700' : 'text-slate-600'} font-bold mb-1`}>اضغط هنا لرفع الوثيقة بصيغة PDF</p>
                                  <p className="text-sm text-slate-400">PDF فقط (الحد الأقصى 5 ميجابايت)</p>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {formData.fileError && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center text-red-500 text-sm mt-3 font-semibold">
                                <AlertCircle size={16} className="me-1.5" /> {formData.fileError}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Educational notes */}
                          {formData.requestDomain === 'إيواء' && formData.housingDocType && (
                            <div className="mt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                              <h4 className="text-sm font-bold text-blue-800 flex items-center">
                                <Info size={16} className="me-2" />
                                الهدف من إرفاق الوثيقة:
                              </h4>
                              <ul className="text-sm text-blue-700 space-y-1.5 list-disc list-inside font-medium">
                                {formData.housingDocType === 'إقامة' && <li><strong>إثبات الحالة المبررة:</strong> لإثبات مكان الإقامة الحالي للطالب(ة).</li>}
                                {formData.housingDocType === 'مسافة' && <li><strong>شهادة المسافة:</strong> لإثبات بُعد السكن عن الجامعة وتحديد الأولوية.</li>}
                                {formData.housingDocType === 'طبي' && <li><strong>الملف الطبي:</strong> لعرض الحالة على طبيب الإدارة المختص لتحديد مدى الحاجة لمرافق أو إقامة خاصة.</li>}
                                {formData.housingDocType === 'احتياجات' && <li><strong>بطاقة الاحتياجات:</strong> لإثبات الحالة وتوفير المرافق والغرف المناسبة التي تسهل حركة الطالب(ة).</li>}
                              </ul>
                            </div>
                          )}

                          {formData.requestDomain === 'تغيير الإقامة' && (formData.transferReason === 'مرض' || formData.transferReason === 'احتياجات') && (
                            <div className="mt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                              <h4 className="text-sm font-bold text-blue-800 flex items-center">
                                <Info size={16} className="me-2" />
                                الهدف من إرفاق الوثيقة:
                              </h4>
                              <ul className="text-sm text-blue-700 space-y-1.5 list-disc list-inside font-medium">
                                {formData.transferReason === 'مرض' && <li><strong>الملف الطبي:</strong> لعرض الحالة على طبيب الإدارة المختص لتحديد مدى الحاجة لمرافق أو إقامة خاصة.</li>}
                                {formData.transferReason === 'احتياجات' && <li><strong>بطاقة الاحتياجات:</strong> لإثبات الحالة وتوفير المرافق والغرف المناسبة التي تسهل حركة الطالب(ة).</li>}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Email Field */}
                      <div className="pt-4 border-t border-slate-200/60 mt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            {formData.firstName ? `أين نرسل لك الرد يا ${formData.firstName}؟ (البريد الإلكتروني)` : 'البريد الإلكتروني للرد'}
                          </label>
                          <ValidIndicator isValid={formData.emailPrefix.length >= 3 && hasNoArabicCharacters(formData.emailPrefix)} />
                        </div>
                        
                        <div 
                          className={`relative group cursor-text w-full rounded-2xl border-2 focus-within:ring-4 transition-all bg-white overflow-hidden shadow-sm ${formData.emailPrefix.length > 0 && !hasNoArabicCharacters(formData.emailPrefix) ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/10' : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-emerald-500/10 hover:border-emerald-300'}`} 
                          dir="ltr" 
                          onClick={() => document.getElementById('email-input')?.focus()}
                        >
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Mail className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={22} />
                          </div>
                          <div className="flex items-center w-full pl-14 pr-5 py-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <div className="flex items-center whitespace-nowrap">
                              <input 
                                id="email-input"
                                ref={emailRef}
                                type="text" 
                                dir="ltr"
                                placeholder="username" 
                                value={formData.emailPrefix}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\s/g, '').toLowerCase();
                                  if (val.includes('@')) {
                                    val = val.split('@')[0];
                                  }
                                  updateForm('emailPrefix', val);
                                }}
                                className="bg-transparent border-none outline-none text-slate-800 font-mono text-xl font-bold placeholder:text-slate-300 p-0 m-0 focus:ring-0"
                                style={{ width: formData.emailPrefix ? `${formData.emailPrefix.length + 0.5}ch` : '9ch' }}
                              />
                              <span className={`font-mono text-xl font-bold select-none transition-colors pointer-events-none ${formData.emailPrefix ? 'text-emerald-600' : 'text-slate-300'}`}>
                                @gmail.com
                              </span>
                            </div>
                          </div>
                        </div>
                        <ErrorText message={formData.emailPrefix.length > 0 && !hasNoArabicCharacters(formData.emailPrefix) && 'الرجاء إدخال حروف لاتينية وأرقام فقط'} />
                        
                        <AnimatePresence>
                          {(isEmailFocused || formData.emailPrefix.length > 0) && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: 'auto' }}
                              exit={{ opacity: 0, y: -5, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 flex items-start gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-100/50">
                                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                  لتفادي الأخطاء، قمنا بتثبيت نطاق <span className="font-bold text-blue-800">@gmail.com</span>. يرجى كتابة <span className="text-emerald-700 font-bold bg-emerald-100/50 px-1 rounded">اسم المستخدم فقط</span>.
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {currentStep === 3 && isStep3Valid() && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-8 flex flex-col items-center">
                    <button type="submit" className="w-full md:w-auto md:min-w-[320px] bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20 text-lg flex items-center justify-center">
                      <Sparkles className="me-3 opacity-90" size={22} />
                      إتمام الطلب بنجاح
                    </button>
                    <p className="text-xs text-slate-400 mt-4 flex items-center font-medium">
                      <CheckCircle2 size={12} className="me-1" />
                      البيانات تخضع لمعالجة آمنة وسرية
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}
        </form>
      </div>
    </div>
  );
}
