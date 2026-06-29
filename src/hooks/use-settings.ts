import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Setting {
  value: string | number | boolean | URL;
  type: string;
  group: string;
  description?: string;
}

export function useSettings(group?: string) {
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(true);

  // 加载设置
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/settings${group ? `?group=${group}` : ''}`);
      if (!response.ok) throw new Error('Load settings failed');
      const data = await response.json();
      // 如果值的类型是URL，则将其转换为字符串
      const processedData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value instanceof URL ? value.toString() : value;
        return acc;
      }, {} as Record<string, string | number | boolean>);
      setSettings(processedData);
    } catch (error) {
      toast.error('Load settings failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    loadSettings();
  }, [group]);

  return {
    settings,
    loading,
    loadSettings
  };
}