import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sprzlgoikdbykmqvzkxy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcnpsZ29pa2RieWttcXZ6a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMTk1MDAsImV4cCI6MjEwMjc5NTUwMH0.HuTAtvHrPhdFFhqrfZcntPmEaYJRqyXxrwRfQ9PJbn8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)