export class Environment {
  public static isDevelopment(): boolean {
    return import.meta.env.MODE === 'development';
  }

  public static isProduction(): boolean {
    return import.meta.env.MODE === 'production';
  }

  public static get(key: string, defaultValue: string = ''): string {
    return import.meta.env[`VITE_${key}`] || defaultValue;
  }
}
