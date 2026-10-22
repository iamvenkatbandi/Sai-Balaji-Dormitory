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

type RazorpayEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  amount_paid?: number;
  notes?: { booking_id?: string };
};

type WebhookPayload = {
  event?: string;
  event_id?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const supaUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  if (!secret || !supaUrl || !serviceKey) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  // Verify against the RAW body before parsing
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  );
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHex !== signature) {
    return json({ error: 'bad_signature' }, 400);
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body) as WebhookPayload;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const event = payload.event as string;

  // Subscribe to both; payment.captured and order.paid carry different shapes.
  if (!['payment.captured', 'order.paid'].includes(event)) {
    return json({ ok: true, ignored: event });
  }

  const payment = payload.payload?.payment?.entity;
  const order = payload.payload?.order?.entity;

  const paymentId = payment?.id as string | undefined;
  const orderId = (payment?.order_id ?? order?.id) as string | undefined;
  const amount = (payment?.amount ?? order?.amount_paid) as number | undefined;

  // Try order notes first, then payment notes.
  let bookingId =
    (order?.notes?.booking_id as string | undefined) ??
    (payment?.notes?.booking_id as string | undefined);

  const supa = createClient(supaUrl, serviceKey);

  // Fallback: the order → booking map written by razorpay-create-order.
  if (!bookingId && orderId) {
    const { data } = await supa
      .from('razorpay_orders')
      .select('booking_id')
      .eq('order_id', orderId)
      .maybeSingle();
    bookingId = data?.booking_id;
  }

  const eventId =
    (payload.event_id as string | undefined) ??
    `${event}:${paymentId ?? orderId}`;

  if (!paymentId || !bookingId || amount == null) {
    return json(
      { error: 'missing_fields', paymentId, bookingId, amount, orderId },
      400,
    );
  }

  const { error } = await supa.rpc('confirm_booking_paid', {
    p_booking_id: bookingId,
    p_gateway_event_id: eventId,
    p_gateway_payment_id: paymentId,
    p_amount_paise: amount,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});