import { ILeaveRequestRepository } from '../../../domain/repositories/ILeaveRequestRepository';
export class CreateLeaveRequestUseCase {
  constructor(private repository: ILeaveRequestRepository) {}
  async execute(data: any): Promise<string> { return this.repository.create(data); }
}
