import { ITimeEntryRepository } from '../../../domain/repositories/ITimeEntryRepository';
export class ObserveTimeEntriesUseCase {
  constructor(private repository: ITimeEntryRepository) {}
  execute(companyId: string, callback: (items: any[]) => void): () => void { return this.repository.observe(companyId, callback); }
}
