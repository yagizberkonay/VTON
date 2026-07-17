import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Tek bir instance oluşturuyoruz, uygulama boyunca sadece bu kullanılacak
export const supabase = createClient(supabaseUrl, supabaseAnonKey);