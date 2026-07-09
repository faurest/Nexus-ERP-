export class RegisterUserWithoutLoginUseCase {
  constructor(private authGateway: any) {}
  async execute(email: string, pass: string): Promise<any> {
    if (this.authGateway.registerWithoutLogin) {
      return this.authGateway.registerWithoutLogin(email, pass);
    }
    throw new Error('registerWithoutLogin not implemented in gateway');
  }
}
