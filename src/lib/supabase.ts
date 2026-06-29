import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client public (côté client & serveur pour lecture)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client administrateur (serveur uniquement, contourne RLS pour écrire les commandes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
