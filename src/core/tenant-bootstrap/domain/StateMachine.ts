import { BootstrapState } from './BootstrapState';
import { BootstrapContext } from './BootstrapContext';
import { BootstrapTracer } from '../../observability/tenant-bootstrap';

export class BootstrapStateMachine {
  private state: BootstrapState;
  public context: BootstrapContext;
  private stateHistory: BootstrapState[] = [];

  constructor(context: BootstrapContext) {
    this.state = BootstrapState.BOOTSTRAP_INIT;
    this.context = { ...context, retryCount: context.retryCount || 0 };
    this.recordHistory(this.state);
  }

  public getState(): BootstrapState {
    return this.state;
  }

  public transitionTo(newState: BootstrapState) {
    console.log(`[BootstrapStateMachine] [${this.context.idempotencyKey}] Transition: ${this.state} -> ${newState}`);
    
    BootstrapTracer.traceTransition({
      userId: this.context.userId,
      tenantId: this.context.companyId,
      idempotencyKey: this.context.idempotencyKey,
      stateBefore: this.state,
      stateAfter: newState,
      layer: 'Orchestrator',
      status: newState.startsWith('ERROR_') ? 'FAILED' : 'SUCCESS'
    });

    this.state = newState;
    this.recordHistory(newState);
  }

  private recordHistory(state: BootstrapState) {
    this.stateHistory.push(state);
  }

  public getHistory(): BootstrapState[] {
    return [...this.stateHistory];
  }

  public incrementRetry() {
    this.context.retryCount += 1;
  }
}
