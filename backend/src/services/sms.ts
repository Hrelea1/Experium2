import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

/**
 * Normalizes a Romanian phone number to E.164 format.
 * Examples: 0722123456 -> +40722123456, +40722123456 -> +40722123456
 */
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+40' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!client || !fromNumber) {
    if (!isDummySms()) {
      console.warn('[SMS] Twilio credentials not configured, skipping SMS');
    }
    logSmsDev(to, body);
    return false;
  }

  const normalizedTo = normalizePhoneNumber(to);
  
  // Basic E.164 validation
  if (!/^\+[1-9]\d{1,14}$/.test(normalizedTo)) {
    console.warn(`[SMS] Invalid phone number format: ${normalizedTo}`);
    return false;
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: fromNumber,
      to: normalizedTo,
    });
    console.log(`[SMS] Sent successfully to ${normalizedTo}. SID: ${message.sid}`);
    return true;
  } catch (err) {
    console.error(`[SMS] Error sending to ${normalizedTo}:`, err);
    return false;
  }
}

function isDummySms(): boolean {
  return !process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_sid';
}

function logSmsDev(to: string, body: string) {
  console.log('\n📱 [DEV SMS] -----------------------------------------');
  console.log(`To: ${to}`);
  console.log(`Body: ${body}`);
  console.log('------------------------------------------------------\n');
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

export function getBookingConfirmedSms(params: { title: string; date: string; participants: number; bookingId: string }): string {
  return `Experium: Rezervarea ta pentru ${params.title} pe ${params.date} este confirmată. ${params.participants} participant(i). ID: ${params.bookingId.substring(0, 8)}`;
}

export function getBookingCancelledSms(params: { title: string; date: string; refundEligible: boolean }): string {
  return `Experium: Rezervarea ta pentru ${params.title} pe ${params.date} a fost anulată.${params.refundEligible ? ' Ești eligibil pentru rambursare.' : ''}`;
}

export function getProviderNewBookingSms(params: { title: string; date: string; clientName: string; participants: number }): string {
  return `Experium: Rezervare nouă pentru ${params.title} pe ${params.date}. Client: ${params.clientName}. ${params.participants} participant(i).`;
}

export function getProviderBookingCancelledSms(params: { title: string; date: string; clientName: string }): string {
  return `Experium: Rezervare anulată pentru ${params.title} pe ${params.date}. Client: ${params.clientName}.`;
}

export function getProviderAvailabilityCheckSms(params: { title: string; date: string; clientName: string; confirmUrl: string; declineUrl: string }): string {
  return `Experium: Cerere rezervare pentru ${params.title} pe ${params.date}. Client: ${params.clientName}. Confirmă: ${params.confirmUrl} Refuză: ${params.declineUrl}. Valabil 15m.`;
}

export function getUserPaymentLinkSms(params: { title: string; paymentUrl: string }): string {
  return `Experium: Veste bună! Slotul pentru ${params.title} a fost confirmat. Finalizează achiziția în 15 minute aici: ${params.paymentUrl}`;
}

export function getUserUnavailableSms(params: { title: string; date: string }): string {
  return `Experium: Ne pare rău, slotul pentru ${params.title} pe ${params.date} nu mai este disponibil. Încearcă altă perioadă!`;
}
