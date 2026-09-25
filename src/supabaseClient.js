import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xbwkukykxlnewmalfscf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhid2t1a3lreGxuZXdtYWxmc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDQyMTUsImV4cCI6MjEwNTgyMDIxNX0.XcrZN0s-PYinTZnxAB9mcL2fa69T6-bLHBxsMDG8QFM'

export const supabase = createClient(supabaseUrl, supabaseKey)