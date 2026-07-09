import { ITimeEntryRepository } from '../../domain/repositories/ITimeEntryRepository';

export class TimeEntryGateway {
  constructor(private repository: ITimeEntryRepository) {}

  async create(data: any): Promise<string> { return this.repository.create(data); }
  async update(id: string, data: any): Promise<void> { return this.repository.update(id, data); }
  async delete(id: string): Promise<void> { return this.repository.delete(id); }
  async getById(id: string): Promise<any> { return this.repository.getById(id); }
  async list(companyId: string): Promise<any[]> { return this.repository.list(companyId); }
  observe(companyId: string, callback: (items: any[]) => void): () => void { return this.repository.observe(companyId, callback); }
}
