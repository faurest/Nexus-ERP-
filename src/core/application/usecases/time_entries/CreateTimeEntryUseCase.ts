import { ITimeEntryRepository } from '../../../domain/repositories/ITimeEntryRepository';
export class CreateTimeEntryUseCase {
  constructor(private repository: ITimeEntryRepository) {}
  async execute(data: any): Promise<string> { return this.repository.create(data); }
}
