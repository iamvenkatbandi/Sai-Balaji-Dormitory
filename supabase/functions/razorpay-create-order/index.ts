// deno-lint-ignore no-import-prefix
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  const supaUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  if (!keyId || !keySecret || !supaUrl || !serviceKey) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  let bookingId: string | undefined;
  try {
    const body = await req.json();
    bookingId = body?.booking_id;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!bookingId) return json({ error: 'booking_id_required' }, 400);

  const supa = createClient(supaUrl, serviceKey);

  const { data: booking, error } = await supa
    .from('bookings')
    .select('id, reference, status, total_paise, currency')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) return json({ error: 'db_error', detail: error.message }, 500);
  if (!booking) return json({ error: 'booking_not_found' }, 404);
  if (booking.status !== 'pending_payment') {
    return json({ error: 'invalid_status', status: booking.status }, 409);
  }
  if (!booking.total_paise || booking.total_paise <= 0) {
    return json({ error: 'invalid_amount' }, 409);
  }

  const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: booking.total_paise,
      currency: booking.currency ?? 'INR',
      receipt: booking.reference,
      notes: {
        booking_id: booking.id,
        reference: booking.reference,
      },
    }),
  });

  const order = await rzpRes.json();

  if (!rzpRes.ok) {
    return json({ error: 'razorpay_order_failed', detail: order }, 502);
  }

  await supa.from('razorpay_orders').upsert(
    {
      order_id: order.id,
      booking_id: booking.id,
      amount_paise: order.amount,
      currency: order.currency,
    },
    { onConflict: 'order_id' },
  );

  return json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: keyId,
  });
});