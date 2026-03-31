/**
 * WhatsApp Meta Cloud API Service
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// Use v18.0 or newer for Graph API
const GRAPH_API_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`;

/**
 * Format phone number to international standard.
 * Meta API requires country code without the + sign.
 * Example for Romania: 0722123456 -> 40722123456
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Strip leading 00 if any
  if (cleaned.startsWith('00')) {
    return cleaned.substring(2);
  }
  
  // If it starts with 0 and is 10 digits (Romanian format 07xxxxxxxx)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '40' + cleaned.substring(1);
  }
  
  // If it already has 40 but not starting with +
  if (cleaned.startsWith('40') && cleaned.length === 11) {
    return cleaned;
  }
  
  // Default fallback (returns whatever was cleaned)
  return cleaned;
}

/**
 * Sends a generic WhatsApp Template Message
 */
export async function sendWhatsAppTemplate(
  toPhone: string, 
  templateName: string, 
  languageCode: string = 'ro', 
  components: any[] = []
) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.warn('[WhatsApp] Disabled: WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set in environment.');
    return false;
  }

  const formattedPhone = formatWhatsAppNumber(toPhone);
  
  if (!formattedPhone || formattedPhone.length < 10) {
    console.warn(`[WhatsApp] Invalid phone number provided: ${toPhone}`);
    return false;
  }

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      // Components contain the header/body variables defined in Facebook Business Manager
      components: components.length > 0 ? components : undefined
    }
  };

  try {
    const response = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[WhatsApp Error]', JSON.stringify(data, null, 2));
      return false;
    }

    console.log(`[WhatsApp] Sent template '${templateName}' to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error('[WhatsApp Request Failed]', error);
    return false;
  }
}

/**
 * Booking Confirmation Notice (to client)
 * Template: booking_confirmed
 * Expected body parameters in Facebook BM: {{1}} name, {{2}} title, {{3}} date, {{4}} price
 */
export async function sendWhatsAppBookingConfirmation(data: {
  phone: string;
  clientName: string;
  experienceTitle: string;
  bookingDate: string; // pre-formatted
  totalPrice: number;
}) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: "text", text: data.clientName },
        { type: "text", text: data.experienceTitle },
        { type: "text", text: data.bookingDate },
        { type: "text", text: `${data.totalPrice} RON` }
      ]
    }
  ];

  return sendWhatsAppTemplate(data.phone, 'booking_confirmed', 'ro', components);
}

/**
 * Booking Cancellation Notice (to client)
 * Template: booking_cancelled
 * Expected body parameters in Facebook BM: {{1}} name, {{2}} title, {{3}} refund text
 */
export async function sendWhatsAppBookingCancellation(data: {
  phone: string;
  clientName: string;
  experienceTitle: string;
  refundEligible: boolean;
}) {
  const refundText = data.refundEligible 
    ? "Suma achitată va fi rambursată în termen de 3-5 zile lucrătoare." 
    : "Conform politicii de anulare, această rezervare nu este eligibilă pentru rambursare integrală.";

  const components = [
    {
      type: 'body',
      parameters: [
        { type: "text", text: data.clientName },
        { type: "text", text: data.experienceTitle },
        { type: "text", text: refundText }
      ]
    }
  ];

  return sendWhatsAppTemplate(data.phone, 'booking_cancelled', 'ro', components);
}

/**
 * Provider Alert for New "Assisted" Booking Check
 * Template: provider_new_booking
 * Expected body parameters in BM: {{1}} title, {{2}} date, {{3}} participants
 */
export async function sendWhatsAppProviderAlert(data: {
  phone: string;
  experienceTitle: string;
  bookingDate: string; // pre-formatted
  participants: number;
}) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: "text", text: data.experienceTitle },
        { type: "text", text: data.bookingDate },
        { type: "text", text: data.participants.toString() }
      ]
    }
  ];

  return sendWhatsAppTemplate(data.phone, 'provider_new_booking', 'ro', components);
}

/**
 * Provider Confirm Request (to provider, for starred manual validation)
 * Template: provider_confirm_request
 */
export async function sendWhatsAppProviderConfirmRequest(data: {
  phone: string;
  experienceTitle: string;
  bookingDate: string;
  participants: number;
  confirmUrl: string;
  declineUrl: string;
}) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: "text", text: data.experienceTitle },
        { type: "text", text: data.bookingDate },
        { type: "text", text: data.participants.toString() },
        { type: "text", text: data.confirmUrl },
        { type: "text", text: data.declineUrl }
      ]
    }
  ];

  return sendWhatsAppTemplate(data.phone, 'provider_confirm_request', 'ro', components);
}

/**
 * User Payment Link (to user, after provider confirmed)
 * Template: user_purchase_link
 */
export async function sendWhatsAppUserPaymentLink(data: {
  phone: string;
  clientName: string;
  experienceTitle: string;
  bookingDate: string;
  paymentUrl: string;
}) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: "text", text: data.clientName },
        { type: "text", text: data.experienceTitle },
        { type: "text", text: data.bookingDate },
        { type: "text", text: data.paymentUrl }
      ]
    }
  ];

  return sendWhatsAppTemplate(data.phone, 'user_purchase_link', 'ro', components);
}

/**
 * Booking Unavailable Notice (to user, if provider doesn't confirm)
 * Template: user_booking_unavailable
 */
export async function sendWhatsAppBookingUnavailable(data: {
  phone: string;
  clientName: string;
  experienceTitle: string;
  bookingDate: string;
}) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: "text", text: data.clientName },
        { type: "text", text: data.experienceTitle },
        { type: "text", text: data.bookingDate }
      ]
    }
  ];

  return sendWhatsAppTemplate(data.phone, 'user_booking_unavailable', 'ro', components);
}
