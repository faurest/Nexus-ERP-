import { FeatureFlags, ProviderMode } from '../../config/FeatureFlags';
import { SyncService } from '../../application/services/SyncService';

export abstract class BaseGateway {
  protected featureFlags = FeatureFlags.getInstance();
  protected syncService = SyncService.getInstance();

  protected async execute<T>(
    operationName: string,
    firebaseOp: () => Promise<T>,
    supabaseOp: () => Promise<T>,
    readOnly: boolean = false
  ): Promise<T> {
    const mode = this.featureFlags.getProviderMode();

    if (readOnly) {
      if (mode === ProviderMode.SUPABASE) {
        return supabaseOp();
      }
      // Default to Firebase for FIREBASE and HYBRID reads
      return firebaseOp();
    }

    // Write operations
    if (mode === ProviderMode.SUPABASE) {
      return supabaseOp();
    }
    
    if (mode === ProviderMode.FIREBASE) {
      if (this.featureFlags.isDoubleWriteEnabled()) {
        return this.syncService.syncDoubleWrite(operationName, firebaseOp, async () => { await supabaseOp(); });
      }
      return firebaseOp();
    }

    if (mode === ProviderMode.HYBRID) {
      return this.syncService.syncDoubleWrite(operationName, firebaseOp, async () => { await supabaseOp(); });
    }

    return firebaseOp();
  }
}
