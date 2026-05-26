import { RuntimeConsistencyFence } from './RuntimeConsistencyFence';

export class TransactionalSafetyInterceptor {
  
  static async interceptCriticalMutation<T>(mutationFn: () => Promise<T>, context: string): Promise<T> {
    // Before executing, check if we are allowed to mutate
    RuntimeConsistencyFence.assertActionAllowed('MUTATION', context);
    
    // In a real transactional system, we might queue it, but for now we just fail-fast 
    // to prevent dirty state mutations.
    return await mutationFn();
  }

  static interceptNavigation(targetRoute: string): boolean {
    const isAllowed = RuntimeConsistencyFence.isActionAllowed('NAVIGATION');
    if (!isAllowed) {
      console.warn(`[TransactionalSafetyInterceptor] Navigation to ${targetRoute} blocked by Consistency Fence.`);
    }
    return isAllowed;
  }

  static interceptTenantSwitch(targetTenantId: string): boolean {
    const isAllowed = RuntimeConsistencyFence.isActionAllowed('NAVIGATION'); // Treated as major context shift
    if (!isAllowed) {
       console.warn(`[TransactionalSafetyInterceptor] Tenant Switch to ${targetTenantId} deferred by Consistency Fence.`);
    }
    return isAllowed;
  }
}
