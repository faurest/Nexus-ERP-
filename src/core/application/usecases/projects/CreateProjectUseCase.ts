import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';

export class CreateProjectUseCase {
  constructor(private projectRepository: IProjectRepository) {}
  async execute(companyId: string, projectData: any): Promise<void> {
    return this.projectRepository.create(companyId, projectData);
  }
}
