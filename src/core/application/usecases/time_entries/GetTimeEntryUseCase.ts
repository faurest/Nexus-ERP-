import { ITimeEntryRepository } from '../../../domain/repositories/ITimeEntryRepository';
export class GetTimeEntryUseCase {
  constructor(private repository: ITimeEntryRepository) {}
  async execute(id: string): Promise<any> { return this.repository.getById(id); }
}
