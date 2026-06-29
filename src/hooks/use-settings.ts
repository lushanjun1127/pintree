import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logError } from '@/lib/error-handler';

interface Setting {
  value: string | number | boolean;
  type: string;
  group: string;
  description?: string;
}

export function useSettings(group?: string) {
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载设置
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/settings${group ? `?group=${group}` : ''}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Load settings failed');
      }
      const data = await response.json();
      setSettings(data);
    } catch (error: any) {
      setError(error.message);
      toast.error('Load settings failed');
      logError(error, `useSettings hook - group: ${group || 'all'}`);
    } finally {
      setLoading(false);
    }
  }, [group]);



  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    loadSettings
  };
}
