// deno-lint-ignore no-import-prefix
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type RazorpayPayment = {
  id?: string;
  order_id?: string;
  amount?: number;
  notes?: { booking_id?: string };
};

type RazorpayOrder = {
  id?: string;
  amount_paid?: number;
  amount?: number;
  notes?: { booking_id?: string };
};

type RazorpaySettlement = {
  id?: string;
  amount?: number;
  fees?: number;
  tax?: number;
  utr?: string;
  status?: string;
  created_at?: number;
};

type WebhookPayload = {
  event?: string;
  event_id?: string;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?: { entity?: RazorpayOrder };
    settlement?: { entity?: RazorpaySettlement };
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const supaUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  
  if (!secret || !supaUrl || !serviceKey) return json({ error: 'server_misconfigured' }, 500);

  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHex !== signature) return json({ error: 'bad_signature' }, 400);

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body) as WebhookPayload;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const event = payload.event as string;
  const supa = createClient(supaUrl, serviceKey);

  // ── 1. Handle Settlements ──────────────────────────────────────
  if (event === 'settlement.processed') {
    const settlement = payload.payload?.settlement?.entity;
    if (settlement?.id) {
      const { error: dbError } = await supa.from('settlements').upsert({
        settlement_id: settlement.id,
        amount: settlement.amount,
        fees: settlement.fees,
        tax: settlement.tax,
        utr: settlement.utr,
        status: settlement.status,
        created_at: new Date((settlement.created_at ?? Date.now() / 1000) * 1000).toISOString(),
      }, { onConflict: 'settlement_id' });

      if (dbError) {
        console.error(`[Webhook] Failed to record settlement ${settlement.id}:`, dbError.message);
      } else {
        console.log(`[Webhook] Successfully recorded settlement ${settlement.id}`);
      }
    }
    return json({ ok: true });
  }

  // ── 2. Handle Payments (Reserve Bed) ───────────────────────────
  if (!['payment.captured', 'order.paid', 'payment.authorized'].includes(event)) {
    return json({ ok: true, ignored: event });
  }

  const payment = payload.payload?.payment?.entity;
  const order = payload.payload?.order?.entity;

  const paymentId = payment?.id;
  const orderId = payment?.order_id ?? order?.id;
  const amount = payment?.amount ?? order?.amount_paid ?? order?.amount;

  if (!paymentId || !orderId) return json({ error: 'missing_payment_or_order_id' }, 400);

  const eventId = payload.event_id ?? `${event}:${paymentId}`;
  let bookingId = order?.notes?.booking_id ?? payment?.notes?.booking_id;

  if (!bookingId) {
    const { data } = await supa.from('razorpay_orders').select('booking_id').eq('order_id', orderId).maybeSingle();
    bookingId = data?.booking_id;
  }

  if (!bookingId) {
    console.error(`[Webhook] Could not find booking for order ${orderId}`);
    return json({ ok: false, error: 'booking_not_found' }, 200);
  }

  const { error } = await supa.rpc('confirm_booking_paid', {
    p_booking_id: bookingId,
    p_gateway_event_id: eventId,
    p_gateway_payment_id: paymentId,
    p_amount_paise: amount ?? 0,
  });

  if (error) {
    console.error(`[Webhook] RPC failed for booking ${bookingId}:`, error.message);
    return json({ ok: false, error: error.message }, 200);
  }

  console.log(`[Webhook] Successfully confirmed booking ${bookingId} via ${event}`);
  return json({ ok: true });
});