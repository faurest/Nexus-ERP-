import { ISupportRepository } from '../../../domain/repositories/ISupportRepository';

export class CreateTicketUseCase {
  constructor(private supportRepository: ISupportRepository) {}
  async execute(companyId: string, ticketData: any): Promise<void> {
    return this.supportRepository.createTicket(companyId, ticketData);
  }
}
