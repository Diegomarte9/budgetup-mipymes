import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema for creating report history entry
const createReportHistorySchema = z.object({
  organization_id: z.string().uuid(),
  report_type: z.enum(['csv', 'pdf']),
  file_name: z.string().min(1),
  filters: z.record(z.string(), z.any()).default({}),
  transaction_count: z.number().int().min(0).default(0),
  file_size_bytes: z.number().int().min(0).optional(),
  generation_time_ms: z.number().int().min(0).optional(),
});

// Schema for updating report history entry
const updateReportHistorySchema = z.object({
  status: z.enum(['generating', 'completed', 'failed']),
  file_size_bytes: z.number().int().min(0).optional(),
  generation_time_ms: z.number().int().min(0).optional(),
  error_message: z.string().optional(),
});

// GET /api/reports/history - Get report history for organization
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    // Verify user has access to organization
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

    // Get report history
    const { data: reportHistory, error } = await supabase
      .from('report_history')
      .select(`
        id,
        report_type,
        file_name,
        filters,
        transaction_count,
        file_size_bytes,
        generation_time_ms,
        status,
        error_message,
        created_at,
        completed_at,
        auth.users!user_id (
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching report history:', error);
      return NextResponse.json(
        { error: 'Error al obtener el historial de reportes' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('report_history')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    return NextResponse.json({
      reports: reportHistory || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error in GET /api/reports/history:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/reports/history - Create new report history entry
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createReportHistorySchema.parse(body);

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Create report history entry
    const { data: reportHistory, error } = await supabase
      .from('report_history')
      .insert({
        ...validatedData,
        user_id: user.id,
        status: 'generating',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report history:', error);
      return NextResponse.json(
        { error: 'Error al crear entrada de historial' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      report: reportHistory,
      message: 'Entrada de historial creada exitosamente',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/reports/history:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}