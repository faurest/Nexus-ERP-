// Local cache with TTL layer for mobile performance
export class CustomCache {
  static get(key: string) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    try {
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return item.value;
    } catch {
      return null;
    }
  }

  static set(key: string, value: any, ttl: number = 3600000) {
    const item = {
      value: value,
      expiry: Date.now() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
  }
}
