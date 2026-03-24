import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Optional security: Ensure only Vercel Cron can trigger this endpoint
  // You need to set CRON_SECRET in your Vercel Environment Variables.
  // If not set, it bypasses the check to let you test it locally.
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    console.log('Running Supabase Hearth Pulse (Keep-Alive)...');
    
    // As per the free-tier phase requirement (bennytaccardi/supabase-hearth-pulse),
    // this keeps the DB active by making a tiny query.
    // If the 'keep_alive' table doesn't exist yet, it'll just error, 
    // but the request still reaches PostgREST and keeps the project active.
    const { data, error } = await supabase
      .from('keep_alive')
      .select('*')
      .limit(1);

    return NextResponse.json({ 
      status: 'ok', 
      message: 'Keep-alive ping successful. Free-tier DB kept awake!',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
}
