/**
 * api.ts — Experium API Client
 *
 * Drop-in replacement for the Supabase client.
 * All calls go to the Express backend at VITE_API_URL.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const data = await api.auth.login('email', 'password');
 */

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const BASE_URL = import.meta.env.VITE_API_URL ?? defaultApiUrl;
// ─── Token Storage ────────────────────────────────────────────────────────────
export const tokenStore = {
  get: () => localStorage.getItem('experium_token'),
  set: (token: string) => localStorage.setItem('experium_token', token),
  clear: () => localStorage.removeItem('experium_token'),
};

// ─── Base Fetch Wrapper ───────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }
  return json as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'moderator' | 'provider' | 'user';
  avatar_url?: string;
  phone?: string;
}

export const auth = {
  /** Direct signup: creates account and logs in */
  async signUp(email: string, password: string, fullName?: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    tokenStore.set(result.token);
    return result;
  },

  /** Verify OTP after signup — returns token + user */
  async verifyOtp(email: string, otp: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    tokenStore.set(result.token);
    return result;
  },

  /** Password login */
  async signIn(email: string, password: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenStore.set(result.token);
    return result;
  },

  /** Send magic/OTP email for passwordless login */
  async sendOtp(email: string) {
    return request('/auth/otp/send', { method: 'POST', body: JSON.stringify({ email }) });
  },

  /** Complete OTP login */
  async otpLogin(email: string, otp: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/auth/otp/login', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    tokenStore.set(result.token);
    return result;
  },

  /** Logout — clears local token */
  async signOut() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      tokenStore.clear();
    }
  },

  /** Get current logged-in user profile */
  async getUser(): Promise<User | null> {
    if (!tokenStore.get()) return null;
    try {
      return await request<User>('/auth/me');
    } catch {
      tokenStore.clear();
      return null;
    }
  },

  /** Update profile */
  async updateProfile(data: Partial<Pick<User, 'full_name' | 'phone' | 'avatar_url'>>) {
    return request('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
  },

  /** Change password */
  async changePassword(currentPassword: string, newPassword: string) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },
};

// ─── Experiences ──────────────────────────────────────────────────────────────
export interface Experience {
  id: string;
  title: string;
  short_description?: string;
  description: string;
  price: number;
  original_price?: number;
  child_price?: number;
  pricing_tiers?: { name: string; price: number }[];
  category_name: string;
  category_slug: string;
  category_icon?: string;
  region_name: string;
  region_slug: string;
  location_name: string;
  duration_minutes?: number;
  max_participants: number;
  avg_rating: number;
  total_reviews: number;
  is_featured: boolean;
  is_active?: boolean;
  primary_image?: string;
  images?: { id: string; image_url: string; is_primary: boolean; display_order: number; focal_x?: number; focal_y?: number }[];
  services?: { id: string; name: string; price: number; is_required: boolean; description?: string; max_quantity?: number }[];
  address?: string;
  cancellation_policy?: string;
  includes?: string[];
  min_age?: number;
}

export interface ExperienceFilters {
  category_slug?: string;
  region_id?: string;
  county_id?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  is_featured?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'price' | 'rating' | 'created_at';
  order?: 'ASC' | 'DESC';
}

export const experiences = {
  async create(payload: any): Promise<{ id: string }> {
    return request<{ id: string }>('/experiences', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async list(filters: ExperienceFilters = {}): Promise<{ data: Experience[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    return request(`/experiences?${params.toString()}`);
  },

  async getById(id: string): Promise<Experience> {
    return request(`/experiences/${id}`);
  },

  async update(id: string, payload: any): Promise<{ message: string }> {
    return request(`/experiences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export interface Booking {
  id: string;
  experience_id: string;
  experience_title: string;
  location_name: string;
  experience_image?: string;
  booking_date: string;
  participants: number;
  participant_details?: { name: string; price: number; quantity: number }[];
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  rescheduled_count: number;
  created_at: string;
}

export const bookings = {
  async list(): Promise<Booking[]> {
    return request('/bookings');
  },

  async getById(id: string): Promise<Booking> {
    return request(`/bookings/${id}`);
  },

  async create(data: {
    experience_id: string;
    booking_date: string;
    participants?: number;
    participant_details?: { name: string; price: number; quantity: number }[];
    total_price: number;
    status?: string;
    payment_method?: string;
    special_requests?: string;
  }): Promise<{ id: string }> {
    return request('/bookings', { method: 'POST', body: JSON.stringify(data) });
  },

  async cancel(id: string, reason?: string) {
    return request(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancellation_reason: reason }),
    });
  },

  async reschedule(id: string, newDate: string) {
    return request(`/bookings/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ new_booking_date: newDate }),
    });
  },

  async updateStatus(id: string, status: string) {
    return request(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// ─── Vouchers ─────────────────────────────────────────────────────────────────
export interface Voucher {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired' | 'exchanged' | 'transferred';
  experience_title?: string;
  expiry_date: string;
  purchase_price: number;
}

export const vouchers = {
  async list(): Promise<Voucher[]> {
    return request('/vouchers');
  },

  async validate(code: string): Promise<{ is_valid: boolean; voucher_id?: string; experience_id?: string; error?: string }> {
    return request('/vouchers/validate', { method: 'POST', body: JSON.stringify({ code }) });
  },

  async redeem(voucherId: string, params: { booking_date: string; participants?: number; special_requests?: string }) {
    return request(`/vouchers/${voucherId}/redeem`, { method: 'POST', body: JSON.stringify(params) });
  },
};

// ─── Cart ─────────────────────────────────────────────────────────────────────
export const cart = {
  async get() {
    return request('/cart');
  },

  async add(experienceId: string, quantity = 1) {
    return request('/cart', { method: 'POST', body: JSON.stringify({ experience_id: experienceId, quantity }) });
  },

  async remove(cartItemId: string) {
    return request(`/cart/${cartItemId}`, { method: 'DELETE' });
  },

  async clear() {
    return request('/cart', { method: 'DELETE' });
  },
};

// ─── Regions / Categories ─────────────────────────────────────────────────────
export const regions = {
  async list() {
    return request('/regions');
  },
};

export const categories = {
  async list() {
    return request('/categories');
  },
};

// ─── Availability ─────────────────────────────────────────────────────────────
export const availability = {
  async check(bookingId: string) {
    return request<{ message: string }>('/availability/check', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    });
  },

  async lockSlot(slotId: string): Promise<[{ success: boolean; error_message?: string }]> {
    return request(`/availability/slots/${slotId}/lock`, { method: 'POST' });
  },

  async unlockSlot(slotId: string): Promise<{ success: boolean }> {
    return request(`/availability/slots/${slotId}/unlock`, { method: 'POST' });
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  async getStats() {
    return request('/admin/stats');
  },

  async getUsers(params: { search?: string; role?: string; limit?: number; offset?: number } = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request(`/admin/users?${qs}`);
  },

  async deleteUser(userId: string) {
    return request(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  async setUserRole(userId: string, role: string) {
    return request(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const provider = {
  async getAssignedExperiences(): Promise<any[]> {
    return request('/experiences/assigned');
  },

  async getAvailabilitySlots(from?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    return request(`/availability?${params.toString()}`);
  },

  async getBookings(): Promise<any[]> {
    return request('/bookings/provider');
  },

  async addAvailabilitySlot(data: {
    experience_id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    capacity: number;
  }) {
    return request('/availability/slots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteAvailabilitySlot(slotId: string) {
    return request(`/availability/slots/${slotId}`, { // I need to verify if this route exists
      method: 'DELETE',
    });
  },
};

// ─── Default export ───────────────────────────────────────────────────────────
export const api = {
  auth,
  experiences,
  bookings,
  vouchers,
  cart,
  regions,
  categories,
  admin,
  availability,
  provider,
};

export default api;
