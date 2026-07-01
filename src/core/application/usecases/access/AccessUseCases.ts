export class ObserveAccessUseCase {
  constructor(private staffRepository: any, private customerRepository: any) {}
  execute(userId: string, companyId: string, callback: (access: any) => void) {
    // implementation
  }
}

export class AutoEnrollMemberUseCase {
  constructor(private companyRepository: any, private staffRepository: any) {}
  async execute(userId: string, companyId: string, email: string) {
    // implementation
  }
}
