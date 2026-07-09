import { ITimeEntryRepository } from '../../../domain/repositories/ITimeEntryRepository';
export class ListTimeEntriesUseCase {
  constructor(private repository: ITimeEntryRepository) {}
  async execute(companyId: string): Promise<any[]> { return this.repository.list(companyId); }
}
