import { ISessionFacade } from '../interfaces/ISessionFacade';
import { ObserveSessionUseCase, RefreshSessionUseCase, SyncProfileUseCase } from '../usecases/auth/SessionUseCases';
import { ObserveAccessUseCase, AutoEnrollMemberUseCase } from '../usecases/access/AccessUseCases';
import { LoginUseCase } from '../usecases/auth/LoginUseCase';
import { LoginWithGoogleUseCase } from '../usecases/auth/LoginWithGoogleUseCase';
import { RegisterUseCase } from '../usecases/auth/RegisterUseCase';

export class SessionFacade implements ISessionFacade {
  constructor(
    private observeSessionUseCase: ObserveSessionUseCase,
    private refreshSessionUseCase: RefreshSessionUseCase,
    private syncProfileUseCase: SyncProfileUseCase,
    private observeAccessUseCase: ObserveAccessUseCase,
    private autoEnrollMemberUseCase: AutoEnrollMemberUseCase,
    private loginUseCase: LoginUseCase,
    private loginWithGoogleUseCase: LoginWithGoogleUseCase,
    private registerUseCase: RegisterUseCase,
    private authGateway: any
  ) {}

  initialize(): void {
    // Orchestrate session initialization
  }

  async refresh(): Promise<void> {
    await this.refreshSessionUseCase.execute();
  }

  async logout(): Promise<void> {
    if (this.authGateway && this.authGateway.signOut) {
      await this.authGateway.signOut();
    }
  }

  getCurrentSession(): any {
    return null;
  }

  async login(email: string, password?: string): Promise<any> {
    return this.loginUseCase.execute(email, password);
  }

  async loginWithGoogle(): Promise<any> {
    return this.loginWithGoogleUseCase.execute();
  }

  async registerDemo(email: string, password?: string): Promise<any> {
    if (!password) throw new Error("Password required");
    return this.registerUseCase.execute(email, password);
  }
}
