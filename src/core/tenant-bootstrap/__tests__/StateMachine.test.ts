import { describe, it, expect, beforeEach } from 'vitest';
import { BootstrapStateMachine } from '../domain/StateMachine';
import { BootstrapState } from '../domain/BootstrapState';
import { BootstrapContext } from '../domain/BootstrapContext';

describe('[Unit] Tenant Bootstrap - StateMachine', () => {
  let machine: BootstrapStateMachine;
  let defaultContext: BootstrapContext;

  beforeEach(() => {
    defaultContext = {
      idempotencyKey: 'test_key_123',
      userId: 'usr_1',
      userEmail: 'admin@test.com',
      companyName: 'Test Corp',
      retryCount: 0
    };
    machine = new BootstrapStateMachine(defaultContext);
  });

  it('should initialize with BOOTSTRAP_INIT', () => {
    expect(machine.getState()).toBe(BootstrapState.BOOTSTRAP_INIT);
    expect(machine.context.idempotencyKey).toBe('test_key_123');
  });

  it('should transition correctly and log history', () => {
    machine.transitionTo(BootstrapState.AUTH_VALIDATED);
    expect(machine.getState()).toBe(BootstrapState.AUTH_VALIDATED);
    
    machine.transitionTo(BootstrapState.CHECK_TENANT_EXISTENCE);
    expect(machine.getState()).toBe(BootstrapState.CHECK_TENANT_EXISTENCE);

    const history = machine.getHistory();
    expect(history.length).toBe(3); // INIT, AUTH_VALID, CHECK_TENANT
    expect(history[0]).toBe(BootstrapState.BOOTSTRAP_INIT);
    expect(history[1]).toBe(BootstrapState.AUTH_VALIDATED);
    expect(history[2]).toBe(BootstrapState.CHECK_TENANT_EXISTENCE);
  });

  it('should increment retry count correctly', () => {
    expect(machine.context.retryCount).toBe(0);
    machine.incrementRetry();
    machine.incrementRetry();
    expect(machine.context.retryCount).toBe(2);
  });
});
