export interface IStaffFacade {
  createStaff(staff: any): Promise<string>;
  updateStaff(id: string, data: any): Promise<void>;
  deleteStaff(id: string): Promise<void>;
  getStaff(id: string): Promise<any>;
  listStaff(companyId: string): Promise<any[]>;
  observeStaff(companyId: string, callback: (staff: any[]) => void): () => void;
}
