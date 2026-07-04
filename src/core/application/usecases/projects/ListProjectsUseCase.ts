import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';

export class ListProjectsUseCase {
  constructor(private projectRepository: IProjectRepository) {}
  async execute(companyId: string): Promise<any[]> {
    return this.projectRepository.getProjects(companyId);
  }
}
