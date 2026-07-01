export interface IProjectFacade {
  createProject(project: any): Promise<string>;
  updateProject(id: string, data: any): Promise<void>;
  deleteProject(id: string): Promise<void>;
  getProject(id: string): Promise<any>;
  listProjects(companyId: string): Promise<any[]>;
  observeProjects(companyId: string, callback: (projects: any[]) => void): () => void;
}
