import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema for updating report history entry
const updateReportHistorySchema = z.object({
  status: z.enum(['generating', 'completed', 'failed']),
  file_size_bytes: z.number().int().min(0).optional(),
  generation_time_ms: z.number().int().min(0).optional(),
  error_message: z.string().optional(),
});

// PUT /api/reports/history/[id] - Update report history entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateReportHistorySchema.parse(body);

    // Get existing report history entry to verify ownership
    const { data: existingReport, error: fetchError } = await supabase
      .from('report_history')
      .select('user_id, organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingReport) {
      return NextResponse.json(
        { error: 'Reporte no encontrado' },
        { status: 404 }
      );
    }

    // Verify user has access to this report
    if (existingReport.user_id !== user.id) {
      // Check if user is member of the organization
      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', existingReport.organization_id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'No tienes acceso a este reporte' },
          { status: 403 }
        );
      }
    }

    // Update report history entry
    const updateData: any = {
      ...validatedData,
    };

    // Set completed_at timestamp if status is completed or failed
    if (validatedData.status === 'completed' || validatedData.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedReport, error } = await supabase
      .from('report_history')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report history:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el reporte' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      report: updatedReport,
      message: 'Reporte actualizado exitosamente',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in PUT /api/reports/history/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/history/[id] - Delete report history entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get existing report history entry to verify ownership
    const { data: existingReport, error: fetchError } = await supabase
      .from('report_history')
      .select('user_id, organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingReport) {
      return NextResponse.json(
        { error: 'Reporte no encontrado' },
        { status: 404 }
      );
    }

    // Verify user has access to this report (only owner or admin can delete)
    if (existingReport.user_id !== user.id) {
      // Check if user is admin/owner of the organization
      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', existingReport.organization_id)
        .single();

      if (!membership || membership.role === 'member') {
        return NextResponse.json(
          { error: 'No tienes permisos para eliminar este reporte' },
          { status: 403 }
        );
      }
    }

    // Delete report history entry
    const { error } = await supabase
      .from('report_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report history:', error);
      return NextResponse.json(
        { error: 'Error al eliminar el reporte' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Reporte eliminado exitosamente',
    });

  } catch (error) {
    console.error('Error in DELETE /api/reports/history/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}