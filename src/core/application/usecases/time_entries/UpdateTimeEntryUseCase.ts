import { ITimeEntryRepository } from '../../../domain/repositories/ITimeEntryRepository';
export class UpdateTimeEntryUseCase {
  constructor(private repository: ITimeEntryRepository) {}
  async execute(id: string, data: any): Promise<void> { return this.repository.update(id, data); }
}
