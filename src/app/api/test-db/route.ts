import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const results = {
    envCheck: {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
      hasServiceKey: !!serviceKey,
      urlPrefix: url ? url.substring(0, 15) + '...' : null,
      anonKeyPrefix: anonKey ? anonKey.substring(0, 10) + '...' : null,
      serviceKeyPrefix: serviceKey ? serviceKey.substring(0, 10) + '...' : null,
    },
    anonConnection: 'PENDING',
    serviceConnection: 'PENDING',
    error: null as any,
  };

  if (!url || !anonKey || !serviceKey) {
    results.error = 'Missing environment variables.';
    return NextResponse.json(results, { status: 500 });
  }

  try {
    // 1. Test Anon Key Connection
    const anonClient = createClient(url, anonKey);
    const { error: anonError } = await anonClient.from('quizzes').select('id').limit(1);
    if (anonError) {
      results.anonConnection = `FAILED: ${anonError.message}`;
    } else {
      results.anonConnection = 'SUCCESS';
    }

    // 2. Test Service Role Key Connection
    const serviceClient = createClient(url, serviceKey);
    const { error: serviceError } = await serviceClient.from('user_roles').select('user_id').limit(1);
    if (serviceError) {
      results.serviceConnection = `FAILED: ${serviceError.message}`;
    } else {
      results.serviceConnection = 'SUCCESS';
    }

  } catch (err: any) {
    results.error = err.message || 'Unknown error occurred during connection test.';
  }

  const isSuccess = results.anonConnection === 'SUCCESS' && results.serviceConnection === 'SUCCESS';
  
  return NextResponse.json(results, { status: isSuccess ? 200 : 500 });
}
