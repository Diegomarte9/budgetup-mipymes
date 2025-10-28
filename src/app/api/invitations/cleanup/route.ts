import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredInvitations, getInvitationStats } from '@/lib/invitations/cleanup';

// POST /api/invitations/cleanup - Clean up expired invitations
export async function POST(request: NextRequest) {
  try {
    // Check for authorization header (for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, require it for authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Parse request body for options
    let daysOld = 30; // default
    try {
      const body = await request.json();
      if (body.daysOld && typeof body.daysOld === 'number' && body.daysOld > 0) {
        daysOld = body.daysOld;
      }
    } catch {
      // Use default if no valid body
    }
    
    // Perform cleanup
    const deletedCount = await cleanupExpiredInvitations(daysOld);
    
    // Get updated stats
    const stats = await getInvitationStats();
    
    return NextResponse.json({
      success: true,
      deletedCount,
      stats,
      message: `Limpieza completada: ${deletedCount} invitaciones eliminadas`,
    });
  } catch (error) {
    console.error('Error in POST /api/invitations/cleanup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET /api/invitations/cleanup - Get invitation statistics
export async function GET() {
  try {
    const stats = await getInvitationStats();
    
    return NextResponse.json({
      stats,
      message: 'Estadísticas de invitaciones obtenidas exitosamente',
    });
  } catch (error) {
    console.error('Error in GET /api/invitations/cleanup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}