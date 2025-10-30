import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Create Supabase client
    const supabase = await createClient();
    
    // Test database connection with a simple query
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
      .single();

    const responseTime = Date.now() - startTime;
    
    // Check if database is accessible
    const databaseStatus = error ? 'error' : 'healthy';
    const databaseMessage = error ? error.message : 'Database connection successful';

    // Prepare response
    const healthData = {
      status: databaseStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        api: {
          status: 'healthy',
          message: 'API is operational'
        },
        database: {
          status: databaseStatus,
          message: databaseMessage,
          responseTime: `${responseTime}ms`
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      }
    };

    // Return appropriate status code
    const statusCode = databaseStatus === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        api: {
          status: 'healthy',
          message: 'API is operational'
        },
        database: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown database error',
          responseTime: `${Date.now() - startTime}ms`
        }
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        type: error instanceof Error ? error.constructor.name : 'UnknownError'
      }
    };

    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json'
      }
    });
  }
}

// Support HEAD requests for simple health checks
export async function HEAD() {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
      .single();

    return new NextResponse(null, { 
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }
}