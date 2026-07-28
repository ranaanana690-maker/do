# 📌 دليل سياق المشروع والمواصفات الفنية للذكاء الاصطناعي (AI Developer Context & Documentation)

> **ملاحظة للمطور والذكاء الاصطناعي (AI Assistant):**
> تم إعداد هذا الملف خصيصاً ليكتسب أي نموذج ذكاء اصطناعي (AI Agent/LLM) سياقاً كاملاً ودقيقاً للمشروع، بنيته البرمجية، خوارزميات التحقق، وهيكلية الكود، مما يتيح التعديل عليه، بناء ميزات جديدة، أو إصلاح المشكلات بكفاءة عالية دون الإخلال بالميزات الحالية.

---

## 1. 📖 نبذة عن المشروع (Project Summary)

* **اسم المشروع**: منصة دراسة طلبات الإيواء الجامعي - مديرية الخدمات الجامعية معسكر (2026-2027).
* **الفكرة والهدف**: تطبيق ويب تفاعلي أحادي الصفحة (Single Page Application - SPA) مع خادم خلفي مجسر (Backend Proxy). يتيح لطلاب الجامعة تقديم طلبات الخدمة الجامعية (إيواء، تغيير إقامة، تسوية حقوق) بشكل إلكتروني، مع إرفاق الوثائق الرسمية (PDF) وإرسال البيانات آلياً إلى نظام أتمتة خارجي (**n8n Webhook**).
* **اللغة الأساسية للواجهة**: العربية (دعم كامل من اليمين إلى اليسار RTL).

---

## 2. 🛠️ التكنولوجيا المستخدمة (Tech Stack)

### Frontend (الواجهة الأمامية)
* **React 19** + **TypeScript**: لتوفير أداء ممتاز وأمان عالي في أنواع البيانات (Type Safety).
* **Vite 6**: أداة التطوير والتجميع السريعة (Bundler & Dev Server).
* **TailwindCSS v4**: للتنسيق وإدارة نظام التصميم والأنماط التفاعلية.
* **Framer Motion (`motion/react`)**: لإضافة التغيرات التفاعلية والحركات الناعمة بين الخطوات والشاشات.
* **Lucide React**: حزمة الأيقونات الحديثة الخفيفة.
* **Canvas Confetti**: لإطلاق مؤثرات البهرجة الاحتفالية عند النجاح في التقديم.
* **Web Audio API**: لتوليد نغمات صوتية تأكيدية عند نجاح العملية دون الحاجة لملفات صوتیة خارجية.

### Backend (الخادم الخلفي)
* **Node.js** + **Express**: خادم برمجي يعمل كـ **API Proxy** وسيرفر للإنتاج.
* **Multer**: للتعامل مع رفع الملفات في الذاكرة (`memoryStorage`) وتجهيز بيانات `FormData`.
* **TSX**: لتشغيل ملفات TypeScript المباشرة في بيئة التطوير (`tsx server.ts`).

---

## 3. 📂 هيكلية الملفات (Directory Structure & Map)

```text
form/
├── README.md                      # تعليمات التشغيل الأساسية
├── README_ar.md                   # ملاحظات إضافية بخصوص Airtable/n8n والملفات
├── PROJECT_CONTEXT.md             # (هذا الملف) الدليل التوضيحي الشامل للذكاء الاصطناعي
├── package.json                   # التعريف بالحزم والمكتبات والسكربتات
├── tsconfig.json                  # إعدادات مترجم TypeScript
├── vite.config.ts                 # إعدادات Vite ومكونات TailwindCSS Plugin
├── index.html                     # الصفحة الرئيسية وتحديد وسم Root
├── server.ts                      # سيرفر Express وربط الـ API وسيرفر التطوير
├── public/                        # الملفات الاستاتيكية (مثل الشعار logo.png)
└── src/
    ├── main.tsx                   # نقطة تشغيل React وتثبيت الـ Root
    ├── App.tsx                    # المكون الرئيسي للنموذج والتحقق وإدارة الحالة (القلب النابض)
    ├── ErrorBoundary.tsx          # مكوّن التقاط الأخطاء غير المتوقعة (React Error Boundary)
    └── index.css                  # تعريف استيراد الخطوط، مفاتيح الحركة، ومتغيرات Tailwind v4
```

---

## 4. ⚙️ تحليل كود الخادم الخلفي ([server.ts](file:///c:/Users/AYOO%20INFO/Desktop/form/server.ts))

### ووظيفته الأساسية:
يعمل `server.ts` كـ **Middleware & Proxy**:
1. يستقبل طلبات `POST` من الواجهة الأمامية على المسار المحالي `/api/submit`.
2. يتم معالجة الملفات المرفقة بواسطة `multer({ storage: storage.memoryStorage() })`.
3. يقوم الخادم بتجميع البيانات وحفظ الملف المرفق كـ `Blob` وإعادة إرسال الطلب عبر `fetch` (Multi-part Form Data) إلى مسار n8n Webhook:
   `https://leptosomic-odessa-teughly.ngrok-free.dev/webhook-test/618d1331-1902-4ea5-a4d4-d3a9b8689b9b`
4. يتضمن الخادم آلية **Fallback لطلبات GET** في حال فشل POST برمز 404 موضحاً استجابة GET.
5. في بيئة التطوير (`NODE_ENV !== 'production'`)، يقوم الخادم بدمج **Vite Dev Server** كمحول برمجي تلقائي (Middleware Mode).

---

## 5. 🧠 نموذج البيانات وإدارة الحالة في الواجهة الأمامية ([App.tsx](file:///c:/Users/AYOO%20INFO/Desktop/form/src/App.tsx))

### هيكل البيانات (`FormData Interface`)
```typescript
type BacYear = string;
type RequestDomain = 'إيواء' | 'تغيير الإقامة' | 'تسوية دفع حقوق الإيواء' | '';
type HousingDocType = 'إقامة' | 'مسافة' | 'طبي' | 'احتياجات' | '';
type TransferReason = 'أخوة' | 'مرض' | 'احتياجات' | '';

interface FormData {
  firstName: string;           // الاسم الشخصي (بالعربية)
  lastName: string;            // اللقب العائلي (بالعربية)
  dobDay: string;              // يوم الميلاد (DD)
  dobMonth: string;            // شهر الميلاد (MM)
  dobYear: string;             // سنة الميلاد (YYYY)
  bacYear: BacYear;            // سنة الحصول على البكالوريا
  registrationNumber: string; // رقم التسجيل بالبكالوريا
  requestDomain: RequestDomain;// مجال الطلب الرئيسي
  housingDocType: HousingDocType; // نوع وثيقة الإيواء المبررة
  transferReason: TransferReason; // سبب طلب تغيير الإقامة
  siblingName: string;         // اسم الأخ/الأخت (في حال اختيار سبب الأخوة)
  emailPrefix: string;         // بادئة البريد الإلكتروني قبل @gmail.com
  fileUploaded: boolean;       // حالة رفع الملف
  fileName: string;            // اسم الملف المرفوع
  fileError: string;           // رسالة خطأ الملف إن وجدت
}
```

### إدارة الاستمرارية (State Persistence)
* يتم حفظ مسودة الاستمارة حالة بحالة في `localStorage` تحت المفتاح: `bac_form_draft_v1`.
* يتم مسح المسودة تلقائياً بمجرد إتمام التقديم وتغير الحالة إلى `status === 'success'`.

---

## 6. 🛡️ خوارزميات التحقق واشتراطات البيانات (Validations Logic)

1. **اسم ولقب الطالب**:
   * الدالة المستخدمة: `isArabicOnly(str)` (`/^[\u0600-\u06FF\s]+$/`).
   * الشرط: الحروف أصلها عربي فقط، ولا تقل عن حرفين.
2. **تاريخ الميلاد**:
   * اليوم: `1` إلى `31`.
   * الشهر: `1` إلى `12`.
   * السنة: `1950` إلى `2011` (التحقق من السن القانوني).
   * الانتقال التلقائي بين الخانات بمجرد اكتمال إدخال الأرقام (Auto-Tab Behavior via `Ref`).
3. **رقم التسجيل في البكالوريا**:
   * الدالة المستخدمة: `hasNoArabicCharacters(str)` (`!/[\u0600-\u06FF]/.test(str)`).
   * الشرط: أرقام وحروف لاتينية فقط، بطول لا يقل عن 8 خانات.
4. **الملف المرفق**:
   * النوع المسموح: `application/pdf` فقط.
   * الحجم الأقصى: `5MB` (`5 * 1024 * 1024` بايت).
5. **البريد الإلكتروني**:
   * يتم استبدال أية مسافات تحسباً، وحذف أية تكملة إضافية لـ `@gmail.com` إذا أدخلها الطالب.
   * التثبيت التلقائي لنطاق `@gmail.com` لضمان صحة البريد الإلكتروني.

---

## 7. 🎨 نظام التصميم وتجربة المستخدم (UI/UX Principles)

* **الشاشة الترحيبية (Splash Screen)**: تظهر أولاً لإعطاء انطباع رسمي واحترافي بوجود شعار مديرية الخدمات الجامعية وتحديد الهدف من المنصة.
* **البطاقات التفاعلية (DomainCard Component)**: أزرار بطاقات مع تأثيرات البصمة الحركية (`motion.div layoutId="outline"`) عند الاختيار.
* **المؤشرات المرئية (ValidIndicator & ErrorText)**: ظهور أيقونة الصح الخضراء فور استيفاء شروط الحقل، وظهور تنبيه أحمر تفاعلي فور إدخال بيانات غير متوافقة.
* **التمرير التلقائي (Smart Auto-Scroll)**: عند الانتقال بين الخطوات يتم التمرير بسلاسة `scrollIntoView` إلى الخطوة النشطة.

---

## 8. 💻 دليل الأوامر وتطوير الميزات الجديدة (Developer Commands & How-To)

### تشغيل مشروع التطوير محلياً:
```bash
npm run dev
```
*يعمل السيرفر على: http://localhost:3000*

### بناء النسخة الإنتاجية (Production Build):
```bash
npm run build
```

### 💡 كيفية إضافة ميزة أو حقن مسار جديد (How to extend this project):

1. **إضافة حقن أو خيار جديد في الاستمارة**:
   * قم بتحديث الواجهة `FormData` في [App.tsx](file:///c:/Users/AYOO%20INFO/Desktop/form/src/App.tsx).
   * أضف الحالة الافتراضية في `setFormData`.
   * أضف دالة التحقق المناسبة ضمن دالة `isStep3Valid` أو خطوات الاستمارة.
   * أضف الحقل في واجهة JSX مع ربطه بالـ `updateForm('fieldName', value)`.

2. **تغيير مسار الـ Webhook أو خادم n8n**:
   * افتح [server.ts](file:///c:/Users/AYOO%20INFO/Desktop/form/server.ts).
   * عدّل المتغير `url` في السطر 17 لاستبداله بالرابط المطلوب أو قراءته من متغيرات البيئة `process.env.N8N_WEBHOOK_URL`.

3. **التعامل مع ملفات وحزم نظام التشغيل (Windows Dependencies)**:
   * تم تثبيت الحزم الثنائية التالية لضمان عمل Tailwind Oxide وRollup على Windows:
     * `@rollup/rollup-win32-x64-msvc`
     * `lightningcss-win32-x64-msvc`
     * `@esbuild/win32-x64`
     * `@tailwindcss/oxide-win32-x64-msvc`
   * في حال التصدير لـ Docker/Linux لا داعي لتعديلها حيث يتم تثبيت حزم Linux تلقائياً عند التشغيل في تلك البيئات.

---
*تم إنشاء هذا الملف ليكون مرجعاً تاماً ومتكاملاً لأي عمل تطويري أو أتمتة مستقبلي بواسطة الذكاء الاصطناعي.*
