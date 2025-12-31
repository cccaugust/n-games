import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atrmqomettrtabbccull.supabase.co';
const supabaseKey = 'sb_publishable_GlhasUCkiSj1dPswBdV2lA_5afXydOw';

export const supabase = createClient(supabaseUrl, supabaseKey);
