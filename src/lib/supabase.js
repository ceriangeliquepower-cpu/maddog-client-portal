import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mthjfihctiluqllpegnr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VjcQHDkyEWXohoVwpDxhMw_Tu6fZBO9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
