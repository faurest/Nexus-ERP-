export interface IProjectFacade {
  createProject(companyId: string, project: any): Promise<void>;
  updateProject(companyId: string, id: string, data: any): Promise<void>;
  deleteProject(companyId: string, id: string): Promise<void>;
  getProject(companyId: string, id: string): Promise<any>;
  listProjects(companyId: string): Promise<any[]>;
  observeProjects(companyId: string, callback: (projects: any[]) => void): () => void;
}
