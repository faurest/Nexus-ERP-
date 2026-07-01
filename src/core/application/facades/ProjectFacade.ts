import { IProjectFacade } from '../interfaces/IProjectFacade';

export class ProjectFacade implements IProjectFacade {
  constructor(
    private createProjectUseCase: any,
    private updateProjectUseCase: any,
    private deleteProjectUseCase: any,
    private getProjectUseCase: any,
    private listProjectsUseCase: any,
    private observeProjectsUseCase: any
  ) {}

  async createProject(project: any): Promise<string> { return this.createProjectUseCase.execute(project); }
  async updateProject(id: string, data: any): Promise<void> { return this.updateProjectUseCase.execute(id, data); }
  async deleteProject(id: string): Promise<void> { return this.deleteProjectUseCase.execute(id); }
  async getProject(id: string): Promise<any> { return this.getProjectUseCase.execute(id); }
  async listProjects(companyId: string): Promise<any[]> { return this.listProjectsUseCase.execute(companyId); }
  observeProjects(companyId: string, callback: (projects: any[]) => void): () => void { return this.observeProjectsUseCase.execute(companyId, callback); }
}
