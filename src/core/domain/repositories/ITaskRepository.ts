export interface ITaskRepository {
  getTasks(companyId: string): Promise<any[]>;
  getTaskById(id: string): Promise<any | null>;
  createTask(task: any): Promise<string>;
  updateTask(id: string, data: any): Promise<void>;
  deleteTask(id: string): Promise<void>;
  subscribeToTasks(companyId: string, callback: (tasks: any[]) => void): () => void;
}
