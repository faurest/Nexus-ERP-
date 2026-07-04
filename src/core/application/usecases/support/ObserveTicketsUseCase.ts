import { ISupportRepository } from '../../../domain/repositories/ISupportRepository';

export class ObserveTicketsUseCase {
  constructor(private supportRepository: ISupportRepository) {}
  execute(companyId: string, callback: (tickets: any[]) => void): () => void {
    return this.supportRepository.observeTickets(companyId, callback);
  }
}
