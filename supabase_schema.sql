-- ====================================================================
-- 📜 SUPABASE DATABASE & STORAGE SCHEMA SCRIPT
-- ====================================================================
-- المشروع: منصة دراسة طلبات الإيواء الجامعي - مديرية الخدمات الجامعية معسكر
-- هذا الملف يحتوي على إعداد الجداول، وسلة التخزين (Supabase Storage)، وسياسات الأمان (RLS)، والتنظيف بعد 24 ساعة.
-- قم بنسخ وتشغيل الكود التالي في Supabase SQL Editor.
-- ====================================================================

-- 1️⃣ إنشاء جدول طلبات الإيواء (housing_requests)
CREATE TABLE IF NOT EXISTS public.housing_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dob_day TEXT NOT NULL,
    dob_month TEXT NOT NULL,
    dob_year TEXT NOT NULL,
    bac_year TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    request_domain TEXT NOT NULL,
    housing_doc_type TEXT,
    transfer_reason TEXT,
    sibling_name TEXT,
    email TEXT NOT NULL,
    pdf_file_path TEXT,
    pdf_file_name TEXT,
    status TEXT DEFAULT 'جديد',
    -- أعمدة دورة حياة الملفات والتنظيف بعد 24 ساعة من الاكتمال:
    completed_at TIMESTAMPTZ DEFAULT NULL,
    file_deleted BOOLEAN DEFAULT FALSE,
    file_deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- إضافة الأعمدة إلى الجدول إن كان موجوداً مسبقاً (Migration)
ALTER TABLE public.housing_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.housing_requests ADD COLUMN IF NOT EXISTS file_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.housing_requests ADD COLUMN IF NOT EXISTS file_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- إنشاء فهارس لتحسين سرعة الاستعلامات والبحث وعمليات التنظيف
CREATE INDEX IF NOT EXISTS idx_housing_requests_status ON public.housing_requests(status);
CREATE INDEX IF NOT EXISTS idx_housing_requests_cleanup ON public.housing_requests(status, completed_at, file_deleted) WHERE status = 'مكتمل' AND file_deleted = FALSE;

-- 2️⃣ تفعيل Row Level Security (RLS) لحماية جدول الطلبات
ALTER TABLE public.housing_requests ENABLE ROW LEVEL SECURITY;

-- 2.5️⃣ دالة و Trigger لتسجيل وقت اكتمال الطلب آلياً عند تغيير الحالة إلى 'مكتمل' (لبدء عد تنازلي 24 ساعة)
CREATE OR REPLACE FUNCTION public.handle_housing_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا تغيرت الحالة إلى 'مكتمل'، يتم تثبيت وقت الاكتمال لبدء عد تنازلي 24 ساعة لحذف الملف
    IF NEW.status = 'مكتمل' AND (OLD.status IS NULL OR OLD.status <> 'مكتمل') THEN
        NEW.completed_at = COALESCE(NEW.completed_at, NOW());
    -- إذا تم تغيير الحالة من 'مكتمل' إلى حالة أخرى، يتم إلغاء وقت الاكتمال
    ELSIF NEW.status <> 'مكتمل' AND OLD.status = 'مكتمل' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_housing_request_status_change ON public.housing_requests;
CREATE TRIGGER trg_housing_request_status_change
BEFORE UPDATE ON public.housing_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_housing_request_status_change();

-- حذف السياسات القديمة إن وجدت لإعادة التهيئة النظيفة
DROP POLICY IF EXISTS "Allow public insert for housing requests" ON public.housing_requests;
DROP POLICY IF EXISTS "Allow admin to view housing requests" ON public.housing_requests;
DROP POLICY IF EXISTS "Allow admin to update housing requests" ON public.housing_requests;

-- سياسة إدخال الطلبات: السماح للجميع بتقديم طلب جديد فقط (Insert Only)
CREATE POLICY "Allow public insert for housing requests"
ON public.housing_requests
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- سياسة القراءة: المقتصرة فقط على الآدمن المسجل والموثوق (Select Only for Authenticated Admin)
CREATE POLICY "Allow admin to view housing requests"
ON public.housing_requests
FOR SELECT 
TO authenticated
USING (auth.role() = 'authenticated');

-- سياسة التحديث: المقتصرة على الآدمن المسجل لتغيير حالة الطلب (Update Only for Authenticated Admin)
CREATE POLICY "Allow admin to update housing requests"
ON public.housing_requests
FOR UPDATE 
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 3️⃣ جدول إعدادات النظام وقالب البريد الإلكتروني (system_settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج القالب الافتراضي لرسالة التقديم للطلاب
INSERT INTO public.system_settings (key, value)
VALUES (
    'email_template', 
    'مرحباً الطالب(ة) {first_name} {last_name}،

تم استلام طلبكم الخاص بـ "{request_domain}" بنجاح لدى مديرية الخدمات الجامعية معسكر.
رقم التسجيل: {registration_number}
سنة البكالوريا: {bac_year}

نحيطكم علماً أن ملفكم في طور الدراسة والمعالجة من طرف مصلحة الإيواء، وسيتم مراسلتكم فور اتخاذ القرار النهائي.

شكراً لتواصلكم معنا.
مديرية الخدمات الجامعية معسكر - مصلحة الإيواء'
)
ON CONFLICT (key) DO NOTHING;

-- RLS Policies لجدول الإعدادات
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin modify system_settings" ON public.system_settings;

CREATE POLICY "Allow public read system_settings"
ON public.system_settings FOR SELECT
TO anon, authenticated USING (true);

CREATE POLICY "Allow admin modify system_settings"
ON public.system_settings FOR ALL
TO authenticated USING (auth.role() = 'authenticated');

-- 4️⃣ إعداد سلة التخزين السحابي لملفات PDF (Supabase Storage: housing_pdfs)
-- إنشاء سلة التخزين الخاصة بملفات الـ PDF إذا لم تكن موجودة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'housing_pdfs', 
    'housing_pdfs', 
    false, 
    10485760, -- 10MB أقصى حجم
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- سياسات أمان سلة التخزين (Storage RLS Policies)
-- السماح للطلاب (العامة والموثقين) برفع ملفات PDF الخاصة بطلباتهم
DROP POLICY IF EXISTS "Allow public uploads to housing_pdfs" ON storage.objects;
CREATE POLICY "Allow public uploads to housing_pdfs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'housing_pdfs');

-- السماح للمسؤولين الموثقين فقط بقراءة وتنزيل الوثائق
DROP POLICY IF EXISTS "Allow admin select from housing_pdfs" ON storage.objects;
CREATE POLICY "Allow admin select from housing_pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'housing_pdfs');

-- السماح للمسؤولين الموثقين أو سيرفر التنظيف بحذف الملفات
DROP POLICY IF EXISTS "Allow admin delete from housing_pdfs" ON storage.objects;
CREATE POLICY "Allow admin delete from housing_pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'housing_pdfs');
