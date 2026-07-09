import { ITimeEntryRepository } from '../../../domain/repositories/ITimeEntryRepository';
export class DeleteTimeEntryUseCase {
  constructor(private repository: ITimeEntryRepository) {}
  async execute(id: string): Promise<void> { return this.repository.delete(id); }
}
