import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCategorySchema } from '@/lib/validations/categories';
import { ZodError } from 'zod';

// GET /api/categories - List categories for current user's organization
export async function GET(request: NextRequest) {
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

    // Get organization_id from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const type = searchParams.get('type'); // Optional filter by type

    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Build query for categories
    let query = supabase
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId);

    // Add type filter if provided
    if (type && (type === 'income' || type === 'expense')) {
      query = query.eq('type', type);
    }

    // Get categories for the organization
    const { data: categories, error } = await query
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { error: 'Error al obtener las categorías' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
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
    const validatedData = createCategorySchema.parse(body);

    // Verify user has admin access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear categorías en esta organización' },
        { status: 403 }
      );
    }

    // Check if category name already exists in this organization and type
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', validatedData.organization_id)
      .eq('type', validatedData.type)
      .ilike('name', validatedData.name)
      .limit(1);

    if (existingCategory && existingCategory.length > 0) {
      return NextResponse.json(
        {
          error: `Ya existe una categoría de ${validatedData.type === 'income' ? 'ingreso' : 'gasto'} con ese nombre en esta organización`,
        },
        { status: 409 }
      );
    }

    // Create the category
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        organization_id: validatedData.organization_id,
        name: validatedData.name,
        type: validatedData.type,
        color: validatedData.color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);

      // Handle specific database errors
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: `Ya existe una categoría de ${validatedData.type === 'income' ? 'ingreso' : 'gasto'} con ese nombre en esta organización`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error al crear la categoría' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      category,
      message: 'Categoría creada exitosamente',
    });
  } catch (error) {
    console.error('Error in POST /api/categories:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}