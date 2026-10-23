// deno-lint-ignore no-import-prefix
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { booking_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supaUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!keySecret || !supaUrl || !serviceKey) {
      throw new Error('Server misconfigured. Missing secrets.');
    }

    // Verify the Razorpay signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
    const expectedHex = Array.from(new Uint8Array(expected)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedHex !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Fetch the booking to get the exact amount
    const supa = createClient(supaUrl, serviceKey);
    const { data: booking } = await supa.from('bookings').select('total_paise').eq('id', booking_id).single();
    if (!booking) throw new Error('Booking not found');

    // Confirm the booking in the database
    const { error } = await supa.rpc('confirm_booking_paid', {
      p_booking_id: booking_id,
      p_gateway_event_id: `verify:${razorpay_payment_id}`, // Prevents duplicate processing
      p_gateway_payment_id: razorpay_payment_id,
      p_amount_paise: booking.total_paise,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});