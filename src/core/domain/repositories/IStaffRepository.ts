export interface IStaffRepository {
  getStaff(companyId: string): Promise<any[]>;
  getStaffById(id: string): Promise<any | null>;
  createStaff(staff: any): Promise<string>;
  updateStaff(id: string, data: any): Promise<void>;
  deleteStaff(id: string): Promise<void>;
  subscribeToStaff(companyId: string, callback: (staff: any[]) => void): () => void;
}
