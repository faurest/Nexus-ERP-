import { IProjectFacade } from '../interfaces/IProjectFacade';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { CreateProjectUseCase } from '../usecases/projects/CreateProjectUseCase';
import { ListProjectsUseCase } from '../usecases/projects/ListProjectsUseCase';

export class ProjectFacade implements IProjectFacade {
  constructor(
    private createProjectUseCase: CreateProjectUseCase,
    private updateProjectUseCase: any,
    private deleteProjectUseCase: any,
    private getProjectUseCase: any,
    private listProjectsUseCase: ListProjectsUseCase,
    private observeProjectsUseCase: any,
    private repository?: IProjectRepository
  ) {}

  async createProject(companyId: string, project: any): Promise<void> {
    return this.createProjectUseCase.execute(companyId, project);
  }
  async updateProject(companyId: string, id: string, data: any): Promise<void> {
    if (this.updateProjectUseCase) return this.updateProjectUseCase.execute(companyId, id, data);
    if (this.repository && this.repository.update) return this.repository.update(companyId, id, data);
  }
  async deleteProject(companyId: string, id: string): Promise<void> {
    if (this.deleteProjectUseCase) return this.deleteProjectUseCase.execute(companyId, id);
    if (this.repository && this.repository.delete) return this.repository.delete(companyId, id);
  }
  async getProject(companyId: string, id: string): Promise<any> {
    if (this.getProjectUseCase) return this.getProjectUseCase.execute(companyId, id);
    if (this.repository && this.repository.getProject) return this.repository.getProject(companyId, id);
    return null;
  }
  async listProjects(companyId: string): Promise<any[]> {
    return this.listProjectsUseCase.execute(companyId);
  }
  observeProjects(companyId: string, callback: (projects: any[]) => void): () => void {
    if (this.observeProjectsUseCase) return this.observeProjectsUseCase.execute(companyId, callback);
    if (this.repository && this.repository.observeProjects) return this.repository.observeProjects(companyId, callback);
    return () => {};
  }
}
