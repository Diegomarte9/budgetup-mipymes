// Re-export all Supabase utilities
export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { updateSession } from './middleware';

// Types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';
