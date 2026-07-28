import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { recipientEmail, firstName, lastName, registrationNumber, bacYear, requestDomain, templateText, subject } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Missing recipientEmail' });
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
      .replace(/\{first_name\}/g, firstName || '')
      .replace(/\{last_name\}/g, lastName || '')
      .replace(/\{registration_number\}/g, registrationNumber || '')
      .replace(/\{bac_year\}/g, bacYear || '')
      .replace(/\{request_domain\}/g, requestDomain || '');

    const resendApiKey = process.env.RESEND_API_KEY || '';
    const resendSenderEmail = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';
    const resendSenderName = process.env.RESEND_SENDER_NAME || 'مديرية الخدمات الجامعية معسكر';

    const fromAddress = `${resendSenderName} <${resendSenderEmail}>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject: subject || 'تأكيد استلام طلب الخدمة الجامعية - مديرية الخدمات معسكر',
        text: emailBody,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a; line-height: 1.6; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <h2 style="color: #059669; margin-top: 0;">مديرية الخدمات الجامعية معسكر</h2>
              <div style="white-space: pre-wrap; font-size: 15px;">${emailBody.replace(/\n/g, '<br/>')}</div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">هذه الرسالة تم توليدها وإرسالها تلقائياً عبر نظام الخدمات الجامعية معسكر، يرجى عدم الرد المباشر عليها.</p>
            </div>
          </div>
        `
      })
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      return res.status(resendRes.status).json({ error: `Resend API Error: ${errorText}` });
    }

    const resendData = await resendRes.json();
    return res.status(200).json({ success: true, messageId: resendData.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
