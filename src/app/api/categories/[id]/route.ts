import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateCategorySchema } from '@/lib/validations/categories';
import { ZodError } from 'zod';

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: categoryId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCategorySchema.parse({ ...body, id: categoryId });

    // Get the existing category to verify ownership and get organization_id
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*, organization_id')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Verify user has admin access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', existingCategory.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar categorías en esta organización' },
        { status: 403 }
      );
    }

    // If name or type is being updated, check for uniqueness
    if ((validatedData.name && validatedData.name !== existingCategory.name) ||
        (validatedData.type && validatedData.type !== existingCategory.type)) {
      const nameToCheck = validatedData.name || existingCategory.name;
      const typeToCheck = validatedData.type || existingCategory.type;

      const { data: duplicateCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('organization_id', existingCategory.organization_id)
        .eq('type', typeToCheck)
        .ilike('name', nameToCheck)
        .neq('id', categoryId)
        .limit(1);

      if (duplicateCategory && duplicateCategory.length > 0) {
        return NextResponse.json(
          {
            error: `Ya existe una categoría de ${typeToCheck === 'income' ? 'ingreso' : 'gasto'} con ese nombre en esta organización`,
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data (remove undefined values)
    const updateData = Object.fromEntries(
      Object.entries({
        name: validatedData.name,
        type: validatedData.type,
        color: validatedData.color,
        updated_at: new Date().toISOString(),
      }).filter(([_, value]) => value !== undefined)
    );

    // Update the category
    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);

      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: `Ya existe una categoría de ${validatedData.type === 'income' ? 'ingreso' : 'gasto'} con ese nombre en esta organización`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar la categoría' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      category,
      message: 'Categoría actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error in PUT /api/categories/[id]:', error);

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

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: categoryId } = await params;

    // Get the existing category to verify ownership
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*, organization_id')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Verify user has admin access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', existingCategory.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar categorías en esta organización' },
        { status: 403 }
      );
    }

    // Check if category has transactions (requirement 6.5)
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (transactionError) {
      console.error('Error checking transactions:', transactionError);
      return NextResponse.json(
        { error: 'Error al verificar transacciones' },
        { status: 500 }
      );
    }

    if (transactions && transactions.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la categoría porque tiene transacciones asociadas',
        },
        { status: 409 }
      );
    }

    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la categoría' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Categoría eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}