/**
 * Email service — uses Brevo HTTP API (not SMTP).
 * Railway blocks ALL outbound SMTP ports (25, 465, 587, 2525).
 * The Brevo HTTP API at https://api.brevo.com/v3/smtp/email works over HTTPS (port 443).
 *
 * Required env var: BREVO_API_KEY  (get from Brevo dashboard → SMTP & API → API Keys)
 */

// Helper to mask credentials for logging
function maskStr(s?: string): string {
  if (!s) return '(empty)';
  if (s.length <= 6) return s[0] + '***';
  return s.slice(0, 4) + '***' + s.slice(-3);
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'contact@experium.ro';
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'Experium';

function getApiKey(): string | undefined {
  return process.env.BREVO_API_KEY;
}

console.log('[Email] Init — Brevo HTTP API mode');
console.log('[Email] API key set:', !!getApiKey(), '| From:', FROM_EMAIL);

// ─── Core sender via Brevo HTTP API ──────────────────────────────────────────
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
  const apiKey = getApiKey();

  console.log(`[Email] sendEmail to: ${to}, subject: "${subject}"`);

  if (!apiKey) {
    console.log('\n📧 [DEV EMAIL — NOT SENT] -----------------------------------------');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    const match = htmlContent.match(/letter-spacing[^>]+>\s*(\d{4,8})\s*</);
    if (match) console.log(`[OTP CODE]: ${match[1]}`);
    console.log('⚠️  BREVO_API_KEY is missing — email was NOT sent!');
    console.log('------------------------------------------------------\n');
    return;
  }

  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[Email] ❌ Brevo API error ${res.status}:`, JSON.stringify(data));
      throw new Error(`Brevo API error ${res.status}: ${(data as any)?.message || res.statusText}`);
    }

    console.log(`[Email] ✅ Email SENT to ${to} — messageId: ${(data as any)?.messageId}`);
  } catch (err: any) {
    console.error(`[Email] ❌ FAILED to ${to}:`, err.message);
    throw err;
  }
}

// ─── OTP Email ────────────────────────────────────────────────────────────────
export async function sendOtpEmail(email: string, otp: string, name?: string): Promise<void> {
  await sendEmail(email, 'Codul tău de verificare Experium', `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">👋 Bună${name ? `, ${name}` : ''}!</h2>
      <p>Codul tău de verificare este:</p>
      <div style="background: #f0f0f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
      </div>
      <p style="color: #666;">Codul expiră în <strong>10 minute</strong>.</p>
      <p style="color: #666; font-size: 12px;">Dacă nu ai solicitat acest cod, ignoră acest email.</p>
    </div>
  `);
}

// ─── Password Reset Email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, otp: string, name?: string): Promise<void> {
  await sendEmail(email, '🔐 Resetare parolă Experium', `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">🔐 Resetare Parolă</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Experium</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #333; font-size: 16px;">Bună${name ? ` <strong>${name}</strong>` : ''},</p>
        <p style="color: #555; line-height: 1.6;">Am primit o cerere de resetare a parolei pentru contul tău. Folosește codul de mai jos:</p>
        <div style="background: #f8f8f8; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0; border: 2px dashed #ddd;">
          <p style="margin: 0 0 8px; color: #888; font-size: 14px;">Codul tău de resetare</p>
          <span style="font-size: 44px; font-weight: bold; letter-spacing: 10px; color: #1a1a2e;">${otp}</span>
        </div>
        <p style="color: #e67e22; font-size: 14px;">⏱️ Codul este valabil <strong>10 minute</strong>.</p>
        <p style="color: #888; font-size: 13px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">Dacă nu ai solicitat resetarea parolei, poți ignora acest email.</p>
      </div>
    </div>
  `);
}

// ─── Booking Confirmation ─────────────────────────────────────────────────────
export async function sendBookingConfirmation(params: {
  email: string; name: string; experienceTitle: string; bookingDate: string;
  participants: number; totalPrice: number; bookingId: string;
}): Promise<void> {
  await sendEmail(params.email, `Rezervare confirmată — ${params.experienceTitle}`, `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">✅ Rezervare Confirmată!</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Experium</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #333; font-size: 16px; margin-top: 0;">Bună <strong>${params.name}</strong>,</p>
        <p style="color: #555; line-height: 1.6;">Ne bucurăm să îți confirmăm rezervarea pentru experiența:</p>
        <h3 style="color: #1a1a2e; margin: 16px 0 8px; font-size: 18px;">${params.experienceTitle}</h3>
        <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #eaeaea;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">📅 Dată:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.bookingDate}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">👥 Participanți:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.participants}</td></tr>
            <tr><td style="padding: 12px 0 4px; color: #666; font-size: 14px;">💰 Total plătit:</td><td style="padding: 12px 0 4px; text-align: right; color: #10b981; font-weight: bold; font-size: 16px;">${params.totalPrice} RON</td></tr>
          </table>
        </div>
        <p style="color: #555; font-size: 15px; text-align: center; margin: 32px 0;">Ne vedem în curând! 🎉</p>
        <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          <p style="color: #888; font-size: 12px; margin: 0;">ID Rezervare: <span style="font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${params.bookingId}</span></p>
        </div>
      </div>
    </div>
  `);
}

// ─── Provider Booking Notification ──────────────────────────────────────────────
export async function sendProviderBookingNotification(params: {
  providerEmail: string; providerName: string; experienceTitle: string; clientName: string;
  bookingDate: string; participants: number; totalPrice: number; bookingId: string;
}): Promise<void> {
  await sendEmail(params.providerEmail, `Rezervare nouă — ${params.experienceTitle}`, `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 Rezervare Nouă!</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Experium Provider</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #333; font-size: 16px; margin-top: 0;">Bună <strong>${params.providerName}</strong>,</p>
        <p style="color: #555; line-height: 1.6;">Ai primit o nouă rezervare pentru experiența:</p>
        <h3 style="color: #1a1a2e; margin: 16px 0 8px; font-size: 18px;">${params.experienceTitle}</h3>
        <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #eaeaea;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">👤 Client:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.clientName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">📅 Dată:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.bookingDate}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">👥 Participanți:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.participants}</td></tr>
            <tr><td style="padding: 12px 0 4px; color: #666; font-size: 14px;">💰 Câștig total:</td><td style="padding: 12px 0 4px; text-align: right; color: #3b82f6; font-weight: bold; font-size: 16px;">${params.totalPrice} RON</td></tr>
          </table>
        </div>
        <p style="color: #555; font-size: 15px; text-align: center; margin: 32px 0;">Verifică dashboard-ul pentru detalii.</p>
        <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          <p style="color: #888; font-size: 12px; margin: 0;">ID Rezervare: <span style="font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${params.bookingId}</span></p>
        </div>
      </div>
    </div>
  `);
}

// ─── Cancellation Confirmation ────────────────────────────────────────────────
export async function sendCancellationConfirmation(params: {
  email: string; name: string; experienceTitle: string; bookingId: string; refundEligible: boolean;
}): Promise<void> {
  await sendEmail(params.email, `Rezervare anulată — ${params.experienceTitle}`, `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">❌ Rezervare anulată</h2>
      <p>Bună ${params.name},</p>
      <p>Rezervarea ta pentru <strong>${params.experienceTitle}</strong> (ID: ${params.bookingId}) a fost anulată.</p>
      ${params.refundEligible
        ? '<p style="color: green;">✅ Ești eligibil pentru un ramburs integral (anulat cu mai mult de 48h înainte).</p>'
        : '<p style="color: #e67e22;">⚠️ Anulare târzie — politica noastră nu permite ramburs pentru anulări sub 48h înainte de experiență.</p>'
      }
      <p style="color:#666; font-size:12px;">Experium — experiente memorabile</p>
    </div>
  `);
}

// ─── Provider Availability Request ────────────────────────────────────────────
export async function sendAvailabilityRequest(params: {
  providerEmail: string; providerName: string; experienceTitle: string;
  bookingDate: string; confirmUrl: string; declineUrl: string;
}): Promise<void> {
  await sendEmail(params.providerEmail, `Cerere disponibilitate — ${params.experienceTitle}`, `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">📅 Cerere nouă de disponibilitate</h2>
      <p>Bună ${params.providerName},</p>
      <p>Ai primit o rezervare nouă pentru <strong>${params.experienceTitle}</strong> pe data <strong>${params.bookingDate}</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.confirmUrl}" style="background:#22c55e; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; margin-right:16px; font-weight:bold;">✅ Confirmă</a>
        <a href="${params.declineUrl}" style="background:#ef4444; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">❌ Refuză</a>
      </div>
      <p style="color:#666; font-size:12px;">Dacă nu poți accesa butoanele, răspunde la acest email.</p>
    </div>
  `);
}

// ─── Voucher Expiry Alert ─────────────────────────────────────────────────────
export async function sendVoucherExpiryAlert(params: {
  email: string; name: string; voucherCode: string; experienceTitle: string; expiryDate: string;
}): Promise<void> {
  await sendEmail(params.email, `Voucherul tău expiră în curând — ${params.experienceTitle}`, `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">⏰ Voucherul tău expiră în curând!</h2>
      <p>Bună ${params.name},</p>
      <p>Voucherul tău <strong>${params.voucherCode}</strong> pentru <strong>${params.experienceTitle}</strong> expiră pe <strong>${params.expiryDate}</strong>.</p>
      <p>Nu uita să îl folosești!</p>
    </div>
  `);
}

// ─── Provider Voucher Notification ──────────────────────────────────────────────
export async function sendProviderVoucherNotification(params: {
  providerEmail: string; providerName: string; experienceTitle: string; clientName: string; purchasePrice: number;
}): Promise<void> {
  await sendEmail(params.providerEmail, `Voucher nou achiziționat — ${params.experienceTitle}`, `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">🎟️ Un nou voucher a fost achiziționat!</h2>
      <p>Bună ${params.providerName},</p>
      <p>Clientul <strong>${params.clientName}</strong> a achiziționat un voucher pentru <strong>${params.experienceTitle}</strong> în valoare de <strong>${params.purchasePrice} RON</strong>.</p>
      <p>Te rugăm să verifici dashboard-ul pentru mai multe detalii.</p>
      <p style="color:#666; font-size:12px;">Echipa Experium</p>
    </div>
  `);
}

// ─── Newsletter Welcome Email ─────────────────────────────────────────────────
export async function sendNewsletterWelcome(email: string): Promise<void> {
  await sendEmail(email, '🎉 Bun venit în comunitatea Experium!', `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 26px;">🎉 Bun venit la Experium!</h1>
        <p style="color: rgba(255,255,255,0.75); margin: 10px 0 0; font-size: 15px;">Experiente memorabile te așteaptă</p>
      </div>
      <div style="padding: 36px 32px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Mulțumim că te-ai abonat la newsletter-ul nostru! 🙌</p>
        <p style="color: #555; font-size: 15px; line-height: 1.7;">De acum vei fi primul care află despre:</p>
        <ul style="color: #555; font-size: 15px; line-height: 2; padding-left: 20px;">
          <li>🆕 Experiențe noi adăugate pe platformă</li>
          <li>💥 Oferte exclusive și reduceri speciale</li>
          <li>📅 Evenimente și activități de sezon</li>
          <li>🎁 Surprize doar pentru abonații noștri</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://hrelea1.github.io/Experium2" style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">🔍 Explorează experiențele</a>
        </div>
        <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="color: #aaa; font-size: 12px; margin: 0; line-height: 1.6;">Ai primit acest email deoarece te-ai abonat la newsletter-ul Experium.<br/>Poți să te dezabonezi oricând răspunzând la acest email cu "Dezabonare".</p>
        </div>
      </div>
    </div>
  `);
}

// ─── Admin Alert: Booking Declined by Provider ───────────────────────────────
export async function sendBookingDeclinedAdminAlert(params: {
  adminEmail: string; bookingId: string; clientName: string; clientEmail: string;
  experienceTitle: string; bookingDate: string; totalPrice: number;
  providerName: string; providerEmail: string;
}): Promise<void> {
  await sendEmail(params.adminEmail, `⚠️ Rezervare refuzată de furnizor — ${params.experienceTitle}`, `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 28px 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">⚠️ Rezervare Refuzată de Furnizor</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Experium Admin — Notificare automată</p>
      </div>
      <div style="padding: 28px 32px;">
        <p style="color: #333; font-size: 15px; margin-top: 0;">Un furnizor a refuzat o rezervare. Detalii:</p>
        <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #eaeaea;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">📋 ID:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; font-size: 12px;">${params.bookingId}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">🎯 Experiență:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; font-size: 13px;">${params.experienceTitle}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">📅 Data:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; font-size: 13px;">${params.bookingDate}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">💰 Valoare:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #ef4444; font-weight: bold;">${params.totalPrice} RON</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">👤 Client:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-size: 13px;">${params.clientName} (${params.clientEmail})</td></tr>
            <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">🏢 Furnizor:</td><td style="padding: 8px 0; text-align: right; font-size: 13px;">${params.providerName} (${params.providerEmail})</td></tr>
          </table>
        </div>
        <p style="color: #e67e22; font-size: 14px; font-weight: 500;">⚡ Acțiune recomandată: Contactează clientul și furnizorul.</p>
      </div>
    </div>
  `);
}
