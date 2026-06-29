/**
 * 缓存工具类
 */
export class Cache<T = any> {
  private cache: Map<string, { value: T; expiresAt: number }> = new Map();

  constructor(private defaultTtl: number = 5 * 60 * 1000) {} // 默认5分钟

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { value, expiresAt });
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) {
      return false;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 创建全局缓存实例
export const globalCache = new Cache();

// 特定用途的缓存
export const settingsCache = new Cache();
export const collectionsCache = new Cache();