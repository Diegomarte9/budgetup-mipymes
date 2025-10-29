import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkUserSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = checkUserSchema.parse(body);

    // Create admin client to check if user exists
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = users.users.some(u => u.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({ exists: userExists });

  } catch (error) {
    console.error('Error in POST /api/auth/check-user-exists:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}