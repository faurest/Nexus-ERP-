import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecoveryManager } from '../recovery/RecoveryManager';
import { BootstrapContext } from '../domain/BootstrapContext';

describe('[Offline & Recovery] RecoveryManager', () => {
  Storage.prototype.setItem = vi.fn();
  Storage.prototype.getItem = vi.fn();
  Storage.prototype.removeItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should save a context state stringified', () => {
    const ctx: BootstrapContext = {
      idempotencyKey: 'key_1',
      userId: 'u_1',
      userEmail: 'email',
      companyName: 'Test',
      retryCount: 0
    };

    RecoveryManager.saveState(ctx);
    
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    const setArgs = (localStorage.setItem as any).mock.calls[0];
    expect(setArgs[0]).toBe('NEXUS_BOOTSTRAP_PENDING');
    
    const parsedStored = JSON.parse(setArgs[1]);
    expect(parsedStored.idempotencyKey).toBe('key_1');
    expect(parsedStored.timestamp).toBeDefined();
  });

  it('Should retrieve a pending state and disregard expired ones (older than 24h)', () => {
    // Mock valid recent state (1 hour old)
    const validState = JSON.stringify({
       idempotencyKey: 'key_2',
       timestamp: Date.now() - (1000 * 60 * 60)
    });
    
    (localStorage.getItem as any).mockReturnValueOnce(validState);
    const restored = RecoveryManager.getPendingState();
    expect(restored).not.toBeNull();
    expect(restored?.idempotencyKey).toBe('key_2');

    // Mock expired state (48 hours old)
    const expiredState = JSON.stringify({
       idempotencyKey: 'key_3',
       timestamp: Date.now() - (1000 * 60 * 60 * 48)
    });
    (localStorage.getItem as any).mockReturnValueOnce(expiredState);
    const restoredExpired = RecoveryManager.getPendingState();
    expect(restoredExpired).toBeNull();
    // It should also trigger clear
    expect(localStorage.removeItem).toHaveBeenCalledWith('NEXUS_BOOTSTRAP_PENDING');
  });

  it('Should clear storage explicitly', () => {
    RecoveryManager.clearState();
    expect(localStorage.removeItem).toHaveBeenCalledWith('NEXUS_BOOTSTRAP_PENDING');
  });
});
