export class ObserveSessionUseCase {
  constructor(private authRepository: any) {}
  execute(callback: (user: any) => void) {
    return this.authRepository.onAuthStateChanged(callback);
  }
}

export class RefreshSessionUseCase {
  constructor(private authRepository: any) {}
  async execute() {
    // implementation
  }
}

export class SyncProfileUseCase {
  constructor(private accessRepository: any) {}

  async execute(user: any) {
    if (user) {
      await this.accessRepository.syncProfile(user);
    }
  }
}
