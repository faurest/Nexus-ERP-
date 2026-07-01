export enum ProviderMode {
  FIREBASE = 'FIREBASE',
  SUPABASE = 'SUPABASE',
  HYBRID = 'HYBRID', // Read from Firebase, Write to both
  OFFLINE = 'OFFLINE',
  DEBUG = 'DEBUG'
}

export class FeatureFlags {
  private static instance: FeatureFlags;
  
  private flags = {
    providerMode: ProviderMode.FIREBASE,
    enableDoubleWrite: false,
    enableCache: true,
    enableOfflineMode: true,
  };

  private constructor() {}

  public static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  public getProviderMode(): ProviderMode {
    return this.flags.providerMode;
  }

  public setProviderMode(mode: ProviderMode): void {
    this.flags.providerMode = mode;
  }

  public isDoubleWriteEnabled(): boolean {
    return this.flags.enableDoubleWrite;
  }

  public setDoubleWriteEnabled(enabled: boolean): void {
    this.flags.enableDoubleWrite = enabled;
  }
  
  public isCacheEnabled(): boolean {
    return this.flags.enableCache;
  }
}
