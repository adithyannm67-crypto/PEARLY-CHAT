import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Create Supabase client for server-side use only
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Query the profiles table to find the user by username
    // This is a secure server-side query that doesn't expose all emails
    const { data, error } = await supabase
      .from('profiles')
      .select('email, username, name')
      .eq('username', username.toLowerCase().trim()) // Normalize username
      .single();

    if (error || !data) {
      // Username not found or database error - don't expose why
      return NextResponse.json(
        { error: 'Invalid username or email' },
        { status: 404 }
      );
    }

    // Return only the email associated with this username
    // We don't expose other user data to prevent information leakage
    return NextResponse.json({
      email: data.email,
    });
  } catch (err) {
    console.error('Error resolving username:', err);
    return NextResponse.json(
      { error: 'Network error. Please try again.' },
      { status: 500 }
    );
  }
}