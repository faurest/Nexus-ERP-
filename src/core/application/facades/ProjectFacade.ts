import { IProjectFacade } from '../interfaces/IProjectFacade';
import { CreateProjectUseCase } from '../usecases/projects/CreateProjectUseCase';
import { ListProjectsUseCase } from '../usecases/projects/ListProjectsUseCase';

export class ProjectFacade implements IProjectFacade {
  constructor(
    private createProjectUseCase: CreateProjectUseCase,
    private updateProjectUseCase: any,
    private deleteProjectUseCase: any,
    private getProjectUseCase: any,
    private listProjectsUseCase: ListProjectsUseCase,
    private observeProjectsUseCase: any
  ) {}

  async createProject(companyId: string, project: any): Promise<void> { return this.createProjectUseCase.execute(companyId, project); }
  async updateProject(companyId: string, id: string, data: any): Promise<void> { /* Not implemented yet */ }
  async deleteProject(companyId: string, id: string): Promise<void> { /* Not implemented yet */ }
  async getProject(companyId: string, id: string): Promise<any> { /* Not implemented yet */ return null; }
  async listProjects(companyId: string): Promise<any[]> { return this.listProjectsUseCase.execute(companyId); }
  observeProjects(companyId: string, callback: (projects: any[]) => void): () => void { return () => {}; /* Not implemented yet */ }
}
