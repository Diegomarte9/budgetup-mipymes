import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API de invitaciones funcionando correctamente',
    timestamp: new Date().toISOString()
  });
}