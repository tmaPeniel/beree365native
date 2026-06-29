import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://xizlfyrjhzkzdchjezfn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpemxmeXJqaHpremRjaGplemZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mjc0NDksImV4cCI6MjA2MzMwMzQ0OX0.fSIJdIhVVq76EgNdEpjB0qJu0PAACVuJs2IdC6irJmc";

// TODO: definir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// dans l'environnement Expo/EAS, puis retirer le fallback public ci-dessus.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
