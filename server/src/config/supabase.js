import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL and Anon Key must be set in environment variables');
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
export default supabase;