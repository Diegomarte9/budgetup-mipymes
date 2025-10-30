import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  responseTime: string;
  services: {
    api: {
      status: string;
      message: string;
    };
    database: {
      status: string;
      message: string;
      responseTime: string;
    };
  };
  system?: {
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: {
      used: number;
      total: number;
      unit: string;
    };
  };
  error?: {
    message: string;
    type: string;
  };
}

async function fetchHealthStatus(): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    // Even if the response is not ok, we might still get useful health data
    const errorData = await response.json().catch(() => ({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: 'unknown',
      environment: 'unknown',
      uptime: 0,
      responseTime: '0ms',
      services: {
        api: { status: 'error', message: 'API request failed' },
        database: { status: 'unknown', message: 'Unable to check database', responseTime: '0ms' }
      },
      error: {
        message: `HTTP ${response.status}: ${response.statusText}`,
        type: 'NetworkError'
      }
    }));
    
    return errorData;
  }

  return response.json();
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.healthApi(),
    queryFn: fetchHealthStatus,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: 1000,
  });
}

// Simple hook for just checking if the system is healthy
export function useHealthStatus() {
  const { data, isLoading, error } = useHealth();
  
  return {
    isHealthy: data?.status === 'healthy',
    isDegraded: data?.status === 'degraded',
    isError: data?.status === 'error' || !!error,
    isLoading,
    status: data?.status || (error ? 'error' : 'unknown'),
    data,
    error,
  };
}