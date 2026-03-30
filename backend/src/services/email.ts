import nodemailer from 'nodemailer';

console.log('[SMTP] Init with:', {
  host: process.env.SMTP_HOST ?? 'smtp.zoho.eu',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  hasUser: !!process.env.SMTP_USER,
  hasPass: !!process.env.SMTP_PASS,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.zoho.eu',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,  // 10s max to connect
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const FROM = process.env.EMAIL_FROM ?? 'noreply@experium.ro';

// Check if SMTP is using default/dummy config
const isDummyEmail = !process.env.SMTP_USER || process.env.SMTP_USER === 'your@gmail.com';

// Wrapper: fails fast if email takes > 12 seconds
async function sendWithTimeout(mailOptions: Parameters<typeof transporter.sendMail>[0]) {
  if (isDummyEmail) {
    console.log('\n📧 [DEV EMAIL] -----------------------------------------');
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    if (String(mailOptions.html).includes('font-size: 40px')) {
      // Extract OTP for easy copying in dev
      const match = String(mailOptions.html).match(/color: #1a1a2e;">(\d+)<\/span>/);
      if (match) console.log(`[OTP CODE]: ${match[1]}`);
    }
    console.log('------------------------------------------------------\n');
    return;
  }
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Email timeout after 12s')), 12000)
  );
  return Promise.race([transporter.sendMail(mailOptions), timeout]);
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
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">✅ Rezervarea ta a fost confirmată!</h2>
        <p>Bună ${params.name},</p>
        <p>Rezervarea ta pentru <strong>${params.experienceTitle}</strong> a fost confirmată.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; color:#666;">Data:</td><td style="padding:8px;"><strong>${params.bookingDate}</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">Participanți:</td><td style="padding:8px;"><strong>${params.participants}</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">Total:</td><td style="padding:8px;"><strong>${params.totalPrice} RON</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">ID rezervare:</td><td style="padding:8px; font-size:12px;">${params.bookingId}</td></tr>
        </table>
        <p>Ne vedem în curând! 🎉</p>
        <p style="color:#666; font-size:12px;">Experium — experiente memorabile</p>
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
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">🎉 Ai o rezervare nouă!</h2>
        <p>Bună ${params.providerName},</p>
        <p>A fost efectuată o nouă rezervare pentru experiența <strong>${params.experienceTitle}</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; color:#666;">Client:</td><td style="padding:8px;"><strong>${params.clientName}</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">Data:</td><td style="padding:8px;"><strong>${params.bookingDate}</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">Participanți:</td><td style="padding:8px;"><strong>${params.participants}</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">Total:</td><td style="padding:8px;"><strong>${params.totalPrice} RON</strong></td></tr>
          <tr><td style="padding: 8px; color:#666;">ID rezervare:</td><td style="padding:8px; font-size:12px;">${params.bookingId}</td></tr>
        </table>
        <p>Te rugăm să verifici dashboard-ul pentru mai multe detalii.</p>
        <p style="color:#666; font-size:12px;">Echipa Experium</p>
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
