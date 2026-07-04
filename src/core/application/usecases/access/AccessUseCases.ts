import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export interface AccessResult {
  role: string | null;
  status: string | null;
  customPermissions: string[];
  nexusId: string | null;
  email: string | null;
  isClient: boolean;
}

export class ObserveAccessUseCase {
  constructor(private staffRepository: IStaffRepository, private customerRepository: ICustomerRepository) {}

  execute(userId: string, companyId: string, callback: (access: AccessResult | null) => void, email?: string): () => void {
    if (!email) {
      callback(null);
      return () => {};
    }
    const cleanEmail = email.trim().toLowerCase().replace(/\s+/g, '');
    let customerUnsub: (() => void) | null = null;
    
    const staffUnsub = this.staffRepository.observeStaffByEmail(companyId, cleanEmail, async (staff) => {
      if (staff) {
        if (customerUnsub) {
          customerUnsub();
          customerUnsub = null;
        }

        if (staff.uid !== userId || staff.status !== 'active') {
          try {
            await this.staffRepository.updateStaff(staff.id, {
              uid: userId,
              status: 'active',
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to sync staff access", e);
          }
        }

        callback({
          role: staff.role || 'Personnel',
          status: staff.status === 'blocked' ? 'blocked' : 'active',
          customPermissions: staff.customPermissions || [],
          nexusId: staff.id,
          email: staff.email,
          isClient: false
        });
      } else {
        if (!customerUnsub) {
          customerUnsub = this.customerRepository.observeCustomerByEmail(companyId, cleanEmail, async (customer) => {
            if (customer) {
              if (customer.uid !== userId || customer.status !== 'active') {
                try {
                  await this.customerRepository.updateCustomer(customer.id, {
                    uid: userId,
                    status: 'active',
                    updatedAt: new Date().toISOString()
                  });
                } catch (e) {
                  console.error("Failed to sync customer access", e);
                }
              }

              callback({
                role: 'Client',
                status: customer.status === 'blocked' ? 'blocked' : 'active',
                customPermissions: [],
                nexusId: customer.id,
                email: customer.email,
                isClient: true
              });
            } else {
              callback(null);
            }
          });
        }
      }
    });

    return () => {
      staffUnsub();
      if (customerUnsub) {
        customerUnsub();
      }
    };
  }
}

export class AutoEnrollMemberUseCase {
  constructor(private companyRepository: ICompanyRepository, private staffRepository: IStaffRepository) {}

  async execute(userId: string, companyId: string, email: string, displayName?: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase().replace(/\s+/g, '');
    const company = await this.companyRepository.getCompanyById(companyId);
    
    if (company && (company.memberEmails || []).includes(cleanEmail)) {
      try {
        const newId = `${companyId}_${cleanEmail}`;
        await this.staffRepository.createStaff({
          companyId: companyId,
          uid: userId,
          email: cleanEmail,
          name: displayName || cleanEmail.split('@')[0],
          role: 'Personnel',
          status: 'active',
          joinMethod: 'auto_sync',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { documentId: newId });
        
        return true;
      } catch (err) {
        console.error("Auto personnel recovery failed:", err);
        return false;
      }
    }
    
    return false;
  }
}
