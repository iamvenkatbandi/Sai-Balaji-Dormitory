import { supabase } from './supabase';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

let loadPromise: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay Checkout.'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);
}

export function getRazorpayKeyId(): string {
  return (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ?? '';
}

export function isDevManualConfirmAllowed(): boolean {
  return import.meta.env.VITE_DEV_ALLOW_MANUAL_CONFIRM === 'true';
}

/**
 * Extracts the real error from a FunctionsHttpError. @supabase/supabase-js
 * returns the underlying Response in error.context; its body carries the
 * actual { error, detail, status } payload emitted by the Edge Function.
 */
async function extractFunctionError(error: unknown): Promise<string> {
  const base =
    error instanceof Error ? error.message : 'Edge Function call failed.';

  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const raw = await ctx.clone().text();
      if (raw) {
        try {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const parts: string[] = [];
          if (typeof body.error === 'string') parts.push(body.error);
          if (typeof body.detail === 'string') parts.push(body.detail);
          else if (body.detail && typeof body.detail === 'object') {
            parts.push(JSON.stringify(body.detail));
          }
          if (typeof body.status === 'string') parts.push(`status=${body.status}`);
          if (parts.length) return parts.join(' — ');
        } catch {
          // Body was not JSON; fall through to raw text.
          return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
        }
      }
    } catch {
      // Response body was already consumed or unreadable.
    }
  }

  return base;
}

/**
 * Asks the razorpay-create-order Edge Function to create a Razorpay order
 * for the given booking. The amount is derived server-side from the booking
 * row — never trusted from the browser.
 */
export async function createRazorpayOrder(bookingId: string): Promise<RazorpayOrder> {
  const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
    body: { booking_id: bookingId },
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Order creation returned no data.');
  }
  const d = data as Record<string, unknown>;
  if (typeof d.order_id !== 'string') {
    const detail = typeof d.error === 'string' ? `: ${d.error}` : '';
    throw new Error(`Order creation returned no order ID${detail}`);
  }
  return data as RazorpayOrder;
}

export async function verifyRazorpayPayment(
  bookingId: string,
  response: RazorpaySuccessResponse
): Promise<void> {
  const { error } = await supabase.functions.invoke('razorpay-verify', {
    body: {
      booking_id: bookingId,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    },
  });
  if (error) throw new Error(error.message ?? 'Payment verification failed.');
}