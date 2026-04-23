import nodemailer from 'nodemailer';

// Helper to mask credentials for logging
function maskStr(s?: string): string {
  if (!s) return '(empty)';
  if (s.length <= 6) return s[0] + '***';
  return s.slice(0, 4) + '***' + s.slice(-3);
}

// SMTP Config derived from process.env (late evaluation helper)
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST ?? 'smtp.zoho.eu';
  const port = parseInt(process.env.SMTP_PORT ?? '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return { host, port, secure, user, pass };
};

const config = getSmtpConfig();

console.log('[SMTP] Init with:', {
  host: config.host,
  port: config.port,
  secure: config.secure,
  user: maskStr(config.user),
  passSet: !!config.pass,
  passLen: config.pass?.length ?? 0,
});

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: {
    user: config.user,
    pass: config.pass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  tls: {
    rejectUnauthorized: false,  // Railway/cloud environments may have TLS issues
  },
  logger: process.env.SMTP_DEBUG === 'true',
  debug: process.env.SMTP_DEBUG === 'true',
});

const FROM = process.env.EMAIL_FROM ?? 'noreply@experium.ro';

// Dynamic check — evaluated at every call so late-loaded env vars are caught
function isDummyEmail(): boolean {
  return !process.env.SMTP_USER || process.env.SMTP_USER === 'your@gmail.com' || process.env.SMTP_USER === '';
}

// Verify SMTP connection on startup (non-blocking)
transporter.verify()
  .then(() => console.log('[SMTP] ✅ SMTP connection verified successfully'))
  .catch((err) => {
    console.error('[SMTP] ❌ SMTP connection verification FAILED:', err.message, err.code || '');
    console.error('[SMTP] Context:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: maskStr(config.user)
    });
  });

// Wrapper: fails fast if email takes > 15 seconds
async function sendWithTimeout(mailOptions: Parameters<typeof transporter.sendMail>[0]) {
  const dummy = isDummyEmail();
  const currentSmtpUser = process.env.SMTP_USER;
  
  console.log(`[SMTP] sendWithTimeout to: ${mailOptions.to}, subject: "${mailOptions.subject}"`);
  console.log(`[SMTP] Status — isDummy: ${dummy}, user: ${maskStr(currentSmtpUser)}`);

  if (dummy) {
    console.log('\n📧 [DEV EMAIL — NOT SENT] -----------------------------------------');
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    // Extract OTP for easy copying in dev
    const match = String(mailOptions.html).match(/letter-spacing[^>]+>\s*(\d{4,8})\s*</);
    if (match) console.log(`[OTP CODE]: ${match[1]}`);
    console.log('⚠️  SMTP_USER is missing or dummy — email was NOT sent to inbox!');
    console.log('------------------------------------------------------\n');
    return { messageId: 'dummy-id', response: 'dummy-response' };
  }

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Email timeout after 15s (Host: ${config.host}:${config.port})`)), 15000)
    );
    const result = await Promise.race([transporter.sendMail(mailOptions), timeout]);
    console.log(`[SMTP] ✅ Email SENT to ${mailOptions.to} — messageId: ${(result as any)?.messageId}`);
    return result;
  } catch (err: any) {
    console.error(`[SMTP] ❌ Email SEND FAILED to ${mailOptions.to}:`, err.message, err.code || '', err.responseCode || '');
    // If it's a common error like auth or connection, log more context
    if (err.code === 'EAUTH' || err.code === 'ECONNREFUSED') {
      console.error('[SMTP] Diagnostic Check:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: maskStr(config.user)
      });
    }
    throw err;
  }
}

// ─── OTP Email ────────────────────────────────────────────────────────────────
export async function sendOtpEmail(email: string, otp: string, name?: string): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: email,
    subject: 'Codul tău de verificare Experium',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">👋 Bună${name ? `, ${name}` : ''}!</h2>
        <p>Codul tău de verificare este:</p>
        <div style="background: #f0f0f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
        </div>
        <p style="color: #666;">Codul expiră în <strong>10 minute</strong>.</p>
        <p style="color: #666; font-size: 12px;">Dacă nu ai solicitat acest cod, ignoră acest email.</p>
      </div>
    `,
  });
}

// ─── Password Reset Email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, otp: string, name?: string): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: email,
    subject: '🔐 Resetare parolă Experium',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🔐 Resetare Parolă</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Experium</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Bună${name ? ` <strong>${name}</strong>` : ''},</p>
          <p style="color: #555; line-height: 1.6;">Am primit o cerere de resetare a parolei pentru contul tău. Folosește codul de mai jos pentru a seta o parolă nouă:</p>
          <div style="background: #f8f8f8; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0; border: 2px dashed #ddd;">
            <p style="margin: 0 0 8px; color: #888; font-size: 14px;">Codul tău de resetare</p>
            <span style="font-size: 44px; font-weight: bold; letter-spacing: 10px; color: #1a1a2e;">${otp}</span>
          </div>
          <p style="color: #e67e22; font-size: 14px;">⏱️ Codul este valabil <strong>10 minute</strong>.</p>
          <p style="color: #888; font-size: 13px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">Dacă nu ai solicitat resetarea parolei, poți ignora acest email — parola ta nu se va schimba.</p>
        </div>
      </div>
    `,
  });
}

// ─── Booking Confirmation ─────────────────────────────────────────────────────
export async function sendBookingConfirmation(params: {
  email: string;
  name: string;
  experienceTitle: string;
  bookingDate: string;
  participants: number;
  totalPrice: number;
  bookingId: string;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.email,
    subject: `Rezervare confirmată — ${params.experienceTitle}`,
    html: `
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
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">📅 Dată:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.bookingDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">👥 Participanți:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.participants}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 4px; color: #666; font-size: 14px;">💰 Total plătit:</td>
                <td style="padding: 12px 0 4px; text-align: right; color: #10b981; font-weight: bold; font-size: 16px;">${params.totalPrice} RON</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #555; font-size: 15px; text-align: center; margin: 32px 0;">Ne vedem în curând! 🎉</p>
          
          <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            <p style="color: #888; font-size: 12px; margin: 0;">ID Rezervare principală: <span style="font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${params.bookingId}</span></p>
            <p style="color: #aaa; font-size: 11px; margin: 8px 0 0;">Ai primit acest email deoarece ai făcut o rezervare prin platforma Experium.</p>
          </div>
        </div>
      </div>
    `,
  });
}

// ─── Provider Booking Notification ──────────────────────────────────────────────
export async function sendProviderBookingNotification(params: {
  providerEmail: string;
  providerName: string;
  experienceTitle: string;
  clientName: string;
  bookingDate: string;
  participants: number;
  totalPrice: number;
  bookingId: string;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.providerEmail,
    subject: `Rezervare nouă — ${params.experienceTitle}`,
    html: `
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
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">👤 Client:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">📅 Dată:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.bookingDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">👥 Participanți:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600;">${params.participants}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 4px; color: #666; font-size: 14px;">💰 Câștig total:</td>
                <td style="padding: 12px 0 4px; text-align: right; color: #3b82f6; font-weight: bold; font-size: 16px;">${params.totalPrice} RON</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #555; font-size: 15px; text-align: center; margin: 32px 0;">Verifică dashboard-ul pentru a vedea detaliile complete.</p>
          
          <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            <p style="color: #888; font-size: 12px; margin: 0;">ID Rezervare principală: <span style="font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${params.bookingId}</span></p>
          </div>
        </div>
      </div>
    `,
  });
}

// ─── Cancellation Confirmation ────────────────────────────────────────────────
export async function sendCancellationConfirmation(params: {
  email: string;
  name: string;
  experienceTitle: string;
  bookingId: string;
  refundEligible: boolean;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.email,
    subject: `Rezervare anulată — ${params.experienceTitle}`,
    html: `
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
    `,
  });
}

// ─── Provider Availability Request ────────────────────────────────────────────
export async function sendAvailabilityRequest(params: {
  providerEmail: string;
  providerName: string;
  experienceTitle: string;
  bookingDate: string;
  confirmUrl: string;
  declineUrl: string;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.providerEmail,
    subject: `Cerere disponibilitate — ${params.experienceTitle}`,
    html: `
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
    `,
  });
}

// ─── Voucher Expiry Alert ─────────────────────────────────────────────────────
export async function sendVoucherExpiryAlert(params: {
  email: string;
  name: string;
  voucherCode: string;
  experienceTitle: string;
  expiryDate: string;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.email,
    subject: `Voucherul tău expiră în curând — ${params.experienceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⏰ Voucherul tău expiră în curând!</h2>
        <p>Bună ${params.name},</p>
        <p>Voucherul tău <strong>${params.voucherCode}</strong> pentru <strong>${params.experienceTitle}</strong> expiră pe <strong>${params.expiryDate}</strong>.</p>
        <p>Nu uita să îl folosești!</p>
      </div>
    `,
  });
}

// ─── Provider Voucher Notification ──────────────────────────────────────────────
export async function sendProviderVoucherNotification(params: {
  providerEmail: string;
  providerName: string;
  experienceTitle: string;
  clientName: string;
  purchasePrice: number;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.providerEmail,
    subject: `Voucher nou achiziționat — ${params.experienceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">🎟️ Un nou voucher a fost achiziționat!</h2>
        <p>Bună ${params.providerName},</p>
        <p>Clientul <strong>${params.clientName}</strong> a achiziționat un voucher pentru experiența <strong>${params.experienceTitle}</strong> în valoare de <strong>${params.purchasePrice} RON</strong>.</p>
        <p>Voucherul va putea fi folosit ulterior de către client pentru a rezerva o dată la această experiență.</p>
        <p>Te rugăm să verifici dashboard-ul pentru mai multe detalii.</p>
        <p style="color:#666; font-size:12px;">Echipa Experium</p>
      </div>
    `,
  });
}

// ─── Newsletter Welcome Email ─────────────────────────────────────────────────
export async function sendNewsletterWelcome(email: string): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: email,
    subject: '🎉 Bun venit în comunitatea Experium!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px 32px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 26px; letter-spacing: -0.5px;">🎉 Bun venit la Experium!</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 10px 0 0; font-size: 15px;">Experimente memorabile te așteaptă</p>
        </div>
        <div style="padding: 36px 32px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Mulțumim că te-ai abonat la newsletter-ul nostru! 🙌
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.7;">
            De acum vei fi primul care află despre:
          </p>
          <ul style="color: #555; font-size: 15px; line-height: 2; padding-left: 20px;">
            <li>🆕 Experiențe noi adăugate pe platformă</li>
            <li>💥 Oferte exclusive și reduceri speciale</li>
            <li>📅 Evenimente și activități de sezon</li>
            <li>🎁 Surprize doar pentru abonații noștri</li>
          </ul>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://hrelea1.github.io/Experium2" 
               style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
              🔍 Explorează experiențele
            </a>
          </div>

          <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="color: #aaa; font-size: 12px; margin: 0; line-height: 1.6;">
              Ai primit acest email deoarece te-ai abonat la newsletter-ul Experium.<br/>
              Poți să te dezabonezi oricând răspunzând la acest email cu "Dezabonare".
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

// ─── Admin Alert: Booking Declined by Provider ───────────────────────────────
export async function sendBookingDeclinedAdminAlert(params: {
  adminEmail: string;
  bookingId: string;
  clientName: string;
  clientEmail: string;
  experienceTitle: string;
  bookingDate: string;
  totalPrice: number;
  providerName: string;
  providerEmail: string;
}): Promise<void> {
  await sendWithTimeout({
    from: FROM,
    to: params.adminEmail,
    subject: `⚠️ Rezervare refuzată de furnizor — ${params.experienceTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 28px 32px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">⚠️ Rezervare Refuzată de Furnizor</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Experium Admin — Notificare automată</p>
        </div>
        <div style="padding: 28px 32px;">
          <p style="color: #333; font-size: 15px; margin-top: 0;">Un furnizor a refuzat o rezervare. Detalii mai jos:</p>

          <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #eaeaea;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px; width: 40%;">📋 ID Rezervare:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; font-size: 12px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${params.bookingId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">🎯 Experiență:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600; font-size: 13px;">${params.experienceTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">📅 Data rezervată:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a2e; font-weight: 600; font-size: 13px;">${params.bookingDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">💰 Valoare:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #ef4444; font-weight: bold; font-size: 15px;">${params.totalPrice} RON</td>
              </tr>
              <tr>
                <td style="padding: 10px 0 4px; color: #666; font-size: 13px; font-weight: 600; border-top: 2px solid #eee;">👤 Client:</td>
                <td style="padding: 10px 0 4px; text-align: right; color: #1a1a2e; font-size: 13px; border-top: 2px solid #eee;">${params.clientName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666; font-size: 13px;">📧 Email client:</td>
                <td style="padding: 4px 0; text-align: right; color: #2563eb; font-size: 13px;"><a href="mailto:${params.clientEmail}" style="color:#2563eb;">${params.clientEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0 4px; color: #666; font-size: 13px; font-weight: 600; border-top: 2px solid #eee;">🏢 Furnizor:</td>
                <td style="padding: 10px 0 4px; text-align: right; color: #1a1a2e; font-size: 13px; border-top: 2px solid #eee;">${params.providerName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666; font-size: 13px;">📧 Email furnizor:</td>
                <td style="padding: 4px 0; text-align: right; color: #2563eb; font-size: 13px;"><a href="mailto:${params.providerEmail}" style="color:#2563eb;">${params.providerEmail}</a></td>
              </tr>
            </table>
          </div>

          <p style="color: #e67e22; font-size: 14px; font-weight: 500;">⚡ Acțiune recomandată: Contactează clientul și furnizorul pentru a rezolva situația.</p>

          <div style="margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
            <p style="color: #aaa; font-size: 11px; margin: 0;">Acesta este un email automat generat de platforma Experium.</p>
          </div>
        </div>
      </div>
    `,
  });
}
