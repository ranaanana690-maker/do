-- ====================================================================
-- 📜 SUPABASE DATABASE & STORAGE SCHEMA SCRIPT
-- ====================================================================
-- المشروع: منصة دراسة طلبات الإيواء الجامعي - مديرية الخدمات الجامعية معسكر
-- هذا الملف يحتوي على إعداد الجداول وسياسات الأمان (RLS) وخزينة الملفات (Storage Bucket).
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
    pdf_file_path TEXT NOT NULL,
    pdf_file_name TEXT NOT NULL,
    status TEXT DEFAULT 'جديد'
);

-- 2️⃣ تفعيل Row Level Security (RLS) لحماية جدول الطلبات
ALTER TABLE public.housing_requests ENABLE ROW LEVEL SECURITY;

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

-- 3️⃣ إنشاء خزانة الملفات (Storage Bucket) مع تقييد الحجم ونوع الملفات (PDF فقط، 5MB أقصى حد)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'housing_pdfs',
    'housing_pdfs',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];

-- 4️⃣ سياسات أمان خزانة الملفات (Storage Policies)
DROP POLICY IF EXISTS "Allow public upload to housing_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to read housing_pdfs" ON storage.objects;

-- سياسة رفع الملفات للجمهور إلى الـ Bucket
CREATE POLICY "Allow public upload to housing_pdfs"
ON storage.objects 
FOR INSERT 
TO anon, authenticated
WITH CHECK (bucket_id = 'housing_pdfs');

-- سياسة قراءة وتحميل الملفات للأدمن المسجل فقط (Select via Signed URLs)
CREATE POLICY "Allow admin to read housing_pdfs"
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'housing_pdfs');

-- 5️⃣ جدول إعدادات النظام وقالب البريد الإلكتروني (system_settings)
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
