import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BootstrapOrchestrator } from '../orchestration/BootstrapOrchestrator';
import { SupabaseBootstrapRepo } from '../infrastructure/SupabaseBootstrapRepo';
import { FirebaseBootstrapRepo } from '../infrastructure/FirebaseBootstrapRepo';
import { RecoveryManager } from '../recovery/RecoveryManager';
import { TenantRuntime } from '../../runtime/TenantRuntime';
import { useAuthStore } from '../../../store/authStore';

// Mocks
vi.mock('../infrastructure/SupabaseBootstrapRepo');
vi.mock('../infrastructure/FirebaseBootstrapRepo');
vi.mock('../recovery/RecoveryManager');
vi.mock('../../runtime/TenantRuntime');
vi.mock('../../../store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({
      activeCompany: null,
      addMembershipAndSwitch: vi.fn()
    })
  }
}));

describe('[Integration & Chaos] Tenant Bootstrap Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default Happy Path Mocks
    (SupabaseBootstrapRepo.createCompanyIdempotent as any).mockResolvedValue('comp_123');
    (SupabaseBootstrapRepo.createWorkspaceIdempotent as any).mockResolvedValue('ws_123');
    (SupabaseBootstrapRepo.createMembershipIdempotent as any).mockResolvedValue(undefined);
    (FirebaseBootstrapRepo.syncCompanyRealtime as any).mockResolvedValue(undefined);
    (RecoveryManager.getPendingState as any).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Happy Path: Should successfully provision a tenant', async () => {
    const result = await BootstrapOrchestrator.startBootstrap('Acme Corp', 'usr_99', 'admin@acme.com');
    
    // Validations
    expect(result).toBe('comp_123');
    expect(SupabaseBootstrapRepo.createCompanyIdempotent).toHaveBeenCalledTimes(1);
    expect(SupabaseBootstrapRepo.createWorkspaceIdempotent).toHaveBeenCalledTimes(1);
    expect(SupabaseBootstrapRepo.createMembershipIdempotent).toHaveBeenCalledTimes(1);
    expect(FirebaseBootstrapRepo.syncCompanyRealtime).toHaveBeenCalledTimes(1);
    
    // Runtime checks
    expect(TenantRuntime.onTenantSwitch).toHaveBeenCalledWith('comp_123', null);
    
    // Recovery Cleanup
    expect(RecoveryManager.clearState).toHaveBeenCalled();
  });

  it('Chaos/Resilience: Network Failure during Firebase Sync triggers SAGA Rollback', async () => {
    // Inject Network Error for Firebase Sync
    (FirebaseBootstrapRepo.syncCompanyRealtime as any).mockRejectedValueOnce(new Error('Network offline timeout'));

    await expect(
      BootstrapOrchestrator.startBootstrap('Bad Network Corp', 'usr_99', 'admin@acme.com')
    ).rejects.toThrow(/Bootstrap Failed.*ERROR_SYNC/);

    // Ensure Supabase creations were called
    expect(SupabaseBootstrapRepo.createCompanyIdempotent).toHaveBeenCalledTimes(1);
    expect(SupabaseBootstrapRepo.createWorkspaceIdempotent).toHaveBeenCalledTimes(1);
    
    // Ensure Rollback was triggered on Supabase to clean Ghost Tenant
    expect(SupabaseBootstrapRepo.rollbackCompany).toHaveBeenCalledWith('comp_123');
  });

  it('Idempotence: Reuses pending state if crashed', async () => {
    // Inject a simulated crashed state hanging before Workspace Creation
    const crashedState = {
      idempotencyKey: 'boot_usr_99_crash',
      companyName: 'Acme Corp',
      userId: 'usr_99',
      userEmail: 'admin@acme.com',
      companyId: 'comp_123_recovered',
      retryCount: 0
    };
    (RecoveryManager.getPendingState as any).mockReturnValue(crashedState);
    (SupabaseBootstrapRepo.createCompanyIdempotent as any).mockResolvedValue('comp_123_recovered');

    const result = await BootstrapOrchestrator.startBootstrap('Acme Corp', 'usr_99', 'admin@acme.com');

    // Should return the recovered company ID
    expect(result).toBe('comp_123_recovered');
    
    // The idempotency key passed to Supabase should be the recovery one, preventing double booking
    expect(SupabaseBootstrapRepo.createCompanyIdempotent).toHaveBeenCalledWith(
       'Acme Corp', 'usr_99', 'boot_usr_99_crash'
    );
  });
  
  it('Security Validation: Throws if userId is missing (No auth)', async () => {
      await expect(
        BootstrapOrchestrator.startBootstrap('Hacked Corp', '', 'hacker@test.com')
      ).rejects.toThrow(/Unauthenticated/);
      
      expect(SupabaseBootstrapRepo.createCompanyIdempotent).not.toHaveBeenCalled();
  });
});
