// Supabase configuration and validation
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};

// Validate required environment variables
export function validateSupabaseConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate URL format
  try {
    new URL(supabaseConfig.url);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }
}

// Call validation on module load in development
if (process.env.NODE_ENV === 'development') {
  validateSupabaseConfig();
}
