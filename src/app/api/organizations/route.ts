import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrganizationSchema } from '@/lib/validations/onboarding';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication using getUser() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createOrganizationSchema.parse(body);

    console.log('Creating organization for user:', user.id);

    // Check if organization name already exists (case-insensitive)
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', validatedData.name)
      .limit(1);

    if (existingOrg && existingOrg.length > 0) {
      return NextResponse.json(
        {
          error:
            'Ya existe una organización con ese nombre. Por favor, elige un nombre diferente.',
        },
        { status: 409 } // Conflict status code
      );
    }

    // Try to use the RPC function that bypasses RLS
    const { data: result, error: createError } = await supabase.rpc(
      'create_organization_with_owner',
      {
        org_name: validatedData.name,
        org_currency: validatedData.currency,
        owner_user_id: user.id,
      }
    );

    if (createError) {
      console.error(
        'RPC function failed, falling back to direct creation:',
        createError
      );

      // Fallback to direct creation if RPC doesn't exist
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: validatedData.name,
          currency: validatedData.currency,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);

        // Handle specific database errors
        if (orgError.code === '23505') {
          // Unique constraint violation
          return NextResponse.json(
            {
              error:
                'Ya existe una organización con ese nombre. Por favor, elige un nombre diferente.',
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: 'Error al crear la organización' },
          { status: 500 }
        );
      }

      // Create membership with owner role
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          role: 'owner',
        });

      if (membershipError) {
        console.error('Error creating membership:', membershipError);
        // Try to clean up the organization if membership creation fails
        await supabase.from('organizations').delete().eq('id', organization.id);

        return NextResponse.json(
          { error: 'Error al crear la membresía: ' + membershipError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        organization,
        message: 'Organización creada exitosamente',
      });
    }

    // Get the created organization
    const { data: organization, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', result)
      .single();

    if (fetchError) {
      console.error('Error fetching organization:', fetchError);
      return NextResponse.json(
        { error: 'Error al obtener la organización creada' },
        { status: 500 }
      );
    }

    const finalOrganization = organization;

    return NextResponse.json({
      organization: finalOrganization,
      message: 'Organización creada exitosamente',
    });
  } catch (error) {
    console.error('Error in POST /api/organizations:', error);

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
