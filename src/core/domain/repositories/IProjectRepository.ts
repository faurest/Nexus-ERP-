export interface IProjectRepository {
  create(companyId: string, projectData: any): Promise<void>;
  getProjects(companyId: string): Promise<any[]>;
  update?(companyId: string, id: string, projectData: any): Promise<void>;
  delete?(companyId: string, id: string): Promise<void>;
  getProject?(companyId: string, id: string): Promise<any>;
  observeProjects?(companyId: string, callback: (projects: any[]) => void): () => void;
}
