import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInvitationSchema } from '@/lib/validations/invitations';
import { nanoid } from 'nanoid';

// Generate unique invitation code
function generateInvitationCode(): string {
  return nanoid(12).toUpperCase();
}

// GET /api/invitations - List invitations for organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Check if user has admin role in organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver las invitaciones' },
        { status: 403 }
      );
    }

    // Get invitations for organization
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        code,
        expires_at,
        used_at,
        created_at,
        created_by
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Error al obtener las invitaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error in GET /api/invitations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/invitations - Create new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    // Check if user has admin role in organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organizationId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear invitaciones' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('organization_id', validatedData.organizationId)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'El usuario ya es miembro de esta organización' },
        { status: 409 }
      );
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, expires_at, used_at')
      .eq('organization_id', validatedData.organizationId)
      .eq('email', validatedData.email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Ya existe una invitación pendiente para este email' },
        { status: 409 }
      );
    }

    // Generate unique invitation code
    let code = generateInvitationCode();
    let codeExists = true;
    let attempts = 0;

    // Ensure code is unique
    while (codeExists && attempts < 10) {
      const { data: existingCode } = await supabase
        .from('invitations')
        .select('id')
        .eq('code', code)
        .single();

      if (!existingCode) {
        codeExists = false;
      } else {
        code = generateInvitationCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: 'Error al generar código único' },
        { status: 500 }
      );
    }

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        organization_id: validatedData.organizationId,
        email: validatedData.email,
        role: validatedData.role,
        code,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating invitation:', createError);
      return NextResponse.json(
        { error: 'Error al crear la invitación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invitation,
      message: 'Invitación creada exitosamente',
    });
  } catch (error) {
    console.error('Error in POST /api/invitations:', error);

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