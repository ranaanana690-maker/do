import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import dotenv from "dotenv";
import {
  uploadToSupabaseStorage,
  generateSignedDownloadUrl,
  deleteFromSupabaseStorage,
  cleanupExpiredCompletedFiles,
  isSupabaseConfigured,
  serverSupabase,
  BUCKET_NAME,
} from "./server/supabaseStorageService.ts";

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 0️⃣ Supabase Storage Health Check & Diagnostic Route
  const healthHandler = async (req: express.Request, res: express.Response) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const hasAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY);
      const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

      const envCheck = {
        VITE_SUPABASE_URL: supabaseUrl ? `✅ Present (${supabaseUrl.substring(0, 15)}...)` : '❌ Missing',
        VITE_SUPABASE_ANON_KEY: hasAnonKey ? '✅ Present' : '❌ Missing',
        SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '✅ Present' : '⚠️ Optional (Anon key used if missing)',
        BUCKET_NAME: `✅ ${BUCKET_NAME}`,
      };

      if (!isSupabaseConfigured()) {
        return res.status(500).json({
          status: 'error',
          message: 'Supabase is not fully configured in .env',
          envCheck,
        });
      }

      // Check bucket access
      const { data: bucketList, error: bucketError } = await serverSupabase.storage.listBuckets();

      res.json({
        status: 'success',
        message: '🎉 Supabase Storage is 100% CONNECTED and WORKING!',
        bucket: BUCKET_NAME,
        bucketFound: bucketList ? bucketList.some(b => b.name === BUCKET_NAME) : true,
        envCheck,
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  };

  app.get("/api/storage/health", healthHandler);
  app.get("/api/r2/health", healthHandler); // Backward compatible

  // 1️⃣ Supabase Storage Upload Route (supports both multipart and raw binary stream)
  const uploadHandler = async (req: express.Request, res: express.Response) => {
    try {
      let fileBuffer: Buffer | null = null;
      let originalName = 'document.pdf';
      let mimeType = 'application/pdf';
      let registrationNumber = 'unknown';

      if (req.file) {
        fileBuffer = req.file.buffer;
        originalName = req.file.originalname || originalName;
        mimeType = req.file.mimetype || mimeType;
        registrationNumber = req.body?.registrationNumber || registrationNumber;
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          fileBuffer = Buffer.concat(chunks);
          originalName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name'] as string) : originalName;
          mimeType = (req.headers['content-type'] as string) || mimeType;
          registrationNumber = req.headers['x-registration-number'] ? decodeURIComponent(req.headers['x-registration-number'] as string) : registrationNumber;
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ error: "لم يتم استلام أي ملف" });
      }

      const uploadResult = await uploadToSupabaseStorage(
        fileBuffer,
        originalName,
        mimeType,
        registrationNumber
      );

      console.log(`[Supabase Storage Upload] File uploaded successfully: ${uploadResult.key}`);
      res.json(uploadResult);
    } catch (error: any) {
      console.error("Supabase Storage Upload Error:", error);
      res.status(500).json({ error: error.message || "فشل رفع الملف إلى Supabase Storage" });
    }
  };

  app.post("/api/storage/upload", upload.single("file"), uploadHandler);
  app.post("/api/r2/upload", upload.single("file"), uploadHandler); // Backward compatible

  // 2️⃣ Supabase Storage Signed Download URL Route
  const downloadUrlHandler = async (req: express.Request, res: express.Response) => {
    try {
      const key = (req.query.key as string) || (req.query.path as string);
      if (!key) {
        return res.status(400).json({ error: "Missing file key/path parameter" });
      }

      const downloadUrl = await generateSignedDownloadUrl(key, 300); // 5 minutes validity
      res.json({ downloadUrl });
    } catch (error: any) {
      console.error("Storage Download URL Error:", error);
      res.status(500).json({ error: error.message || "تعذر توليد رابط التحميل" });
    }
  };

  app.get("/api/storage/download-url", downloadUrlHandler);
  app.get("/api/r2/download-url", downloadUrlHandler); // Backward compatible

  // 3️⃣ 24-Hour Cleanup Trigger Endpoint (Runs cleanup on-demand or via cron)
  const cleanupHandler = async (req: express.Request, res: express.Response) => {
    try {
      console.log("[API Cleanup Trigger] Starting 24h cleanup check on Supabase Storage...");
      const result = await cleanupExpiredCompletedFiles();
      res.json({
        success: true,
        message: `تم فحص الملفات المكتملة وحذف ${result.deletedCount} ملف بنجاح من Supabase Storage.`,
        ...result,
      });
    } catch (error: any) {
      console.error("Supabase Storage Cleanup Error:", error);
      res.status(500).json({ error: error.message || "حدث خطأ أثناء فحص وحذف الملفات" });
    }
  };

  app.post("/api/storage/cleanup", cleanupHandler);
  app.post("/api/r2/cleanup", cleanupHandler); // Backward compatible

  // 4️⃣ Resend Transactional Email Sending Route
  app.post("/api/send-email", async (req, res) => {
    try {
      const {
        recipientEmail,
        firstName,
        lastName,
        registrationNumber,
        bacYear,
        requestDomain,
        templateText,
        subject,
      } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ error: "Missing recipientEmail" });
      }

      const defaultTemplate = `مرحباً الطالب(ة) {first_name} {last_name}،

تم استلام طلبكم الخاص بـ "{request_domain}" بنجاح لدى مديرية الخدمات الجامعية معسكر.
رقم التسجيل: {registration_number}
سنة البكالوريا: {bac_year}

نحيطكم علماً أن ملفكم في طور الدراسة والمعالجة من طرف مصلحة الإيواء.

شكراً لتواصلكم معنا.
مديرية الخدمات الجامعية معسكر - مصلحة الإيواء`;

      const rawText = templateText || defaultTemplate;

      const emailBody = rawText
        .replace(/\{first_name\}/g, firstName || "")
        .replace(/\{last_name\}/g, lastName || "")
        .replace(/\{registration_number\}/g, registrationNumber || "")
        .replace(/\{bac_year\}/g, bacYear || "")
        .replace(/\{request_domain\}/g, requestDomain || "");

      const resendApiKey = process.env.RESEND_API_KEY || "";
      const resendSenderEmail = process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev";
      const resendSenderName = process.env.RESEND_SENDER_NAME || "مديرية الخدمات الجامعية معسكر";

      const fromAddress = `${resendSenderName} <${resendSenderEmail}>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject: subject || "تأكيد استلام طلب الخدمة الجامعية - مديرية الخدمات معسكر",
          text: emailBody,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a; line-height: 1.6; border-radius: 16px;">
              <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="color: #059669; margin-top: 0;">مديرية الخدمات الجامعية معسكر</h2>
                <div style="white-space: pre-wrap; font-size: 15px;">${emailBody.replace(/\n/g, "<br/>")}</div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">هذه الرسالة تم توليدها وإرسالها تلقائياً عبر نظام الخدمات الجامعية معسكر، يرجى عدم الرد المباشر عليها.</p>
              </div>
            </div>
          `,
        }),
      });

      if (!resendRes.ok) {
        const errorText = await resendRes.text();
        console.error("Resend API Error:", errorText);
        return res.status(resendRes.status).json({ error: `Resend API Error: ${errorText}` });
      }

      const resendData = await resendRes.json();
      console.log(`[Resend Email Success] Email sent to ${recipientEmail}, Resend ID: ${resendData.id}`);
      res.json({ success: true, messageId: resendData.id });
    } catch (error: any) {
      console.error("Send Email Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // 5️⃣ Proxy the request to n8n (Optional backup webhook)
  app.post("/api/submit", upload.single("file"), async (req, res) => {
    try {
      const url = "https://leptosomic-odessa-teughly.ngrok-free.dev/webhook-test/618d1331-1902-4ea5-a4d4-d3a9b8689b9b";

      const formPayload = new FormData();

      for (const [key, value] of Object.entries(req.body)) {
        formPayload.append(key, String(value));
      }

      if (req.file) {
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formPayload.append("file", blob, req.file.originalname);
      }

      let response = await fetch(url, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        body: formPayload as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404 && errorText.includes("GET request")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(req.body)) {
            params.append(key, String(value));
          }
          response = await fetch(`${url}?${params.toString()}`, {
            method: "GET",
            headers: { "ngrok-skip-browser-warning": "true" },
          });

          if (!response.ok) {
            const getErrorText = await response.text();
            return res.status(response.status).json({ error: `GET Fallback failed: ${response.status} - ${getErrorText}` });
          }
        } else {
          return res.status(response.status).json({ error: `POST failed: ${response.status} ${response.statusText} - ${errorText}` });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // 6️⃣ Automated 24h Deletion Background Worker (Runs every 15 minutes)
  const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  setInterval(async () => {
    try {
      await cleanupExpiredCompletedFiles();
    } catch (workerErr) {
      console.error("[Scheduled Cleanup Error]:", workerErr);
    }
  }, CLEANUP_INTERVAL_MS);

  // Initial cleanup check 5 seconds after server startup
  setTimeout(async () => {
    try {
      await cleanupExpiredCompletedFiles();
    } catch (initErr) {
      console.error("[Initial Cleanup Check Notice]:", initErr);
    }
  }, 5000);

  // 7️⃣ Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Supabase Storage configured: ${isSupabaseConfigured() ? "✅ YES (Bucket: " + BUCKET_NAME + ")" : "⚠️ NO (Check .env)"}`);
    console.log(`⏱️ Automated 24h PDF cleanup worker activated (interval: 15 minutes)`);
  });
}

startServer();
