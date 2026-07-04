const fs = require('fs');

const deps = `import React, { createContext, useContext, useMemo } from 'react';
import { FeatureFlags } from '../config/FeatureFlags';
import { Logger } from '../logging/Logger';
import { CacheManager } from '../infrastructure/cache/CacheManager';
import { SyncService } from '../application/services/SyncService';
import { HealthService } from '../application/services/HealthService';
import { AuditService } from '../application/services/AuditService';
import { EventBus } from '../domain/events/EventBus';
import { TenantPolicy } from '../security/TenantPolicy';
import { AuthorizationPolicy } from '../security/AuthorizationPolicy';

import { AuthGateway } from '../infrastructure/gateways/AuthGateway';
import { CustomerGateway } from '../infrastructure/gateways/CustomerGateway';

import { FirebaseCustomerRepository } from '../infrastructure/firebase/FirebaseCustomerRepository';
import { FirebaseCompanyRepository } from '../infrastructure/firebase/FirebaseCompanyRepository';
import { FirebaseStaffRepository } from '../infrastructure/firebase/FirebaseStaffRepository';
import { FirebaseInvoiceRepository } from '../infrastructure/firebase/FirebaseInvoiceRepository';
import { FirebaseProductRepository } from '../infrastructure/firebase/FirebaseProductRepository';
import { FirebaseProjectRepository } from '../infrastructure/firebase/FirebaseProjectRepository';
import { FirebaseNotificationRepository } from '../infrastructure/firebase/FirebaseNotificationRepository';
import { FirebaseSupportRepository } from '../infrastructure/firebase/FirebaseSupportRepository';
import { FirebaseStorageRepository } from '../infrastructure/firebase/FirebaseStorageRepository';

import { ISessionFacade } from '../application/interfaces/ISessionFacade';
import { ICustomerFacade } from '../application/interfaces/ICustomerFacade';
import { ICompanyFacade } from '../application/interfaces/ICompanyFacade';
import { IStaffFacade } from '../application/interfaces/IStaffFacade';
import { IInvoiceFacade } from '../application/interfaces/IInvoiceFacade';
import { IProductFacade } from '../application/interfaces/IProductFacade';
import { IProjectFacade } from '../application/interfaces/IProjectFacade';
import { INotificationFacade } from '../application/interfaces/INotificationFacade';
import { ISupportFacade } from '../application/interfaces/ISupportFacade';
import { IStorageFacade } from '../application/interfaces/IStorageFacade';

import { SessionFacade } from '../application/facades/SessionFacade';
import { CustomerFacade } from '../application/facades/CustomerFacade';
import { CompanyFacade } from '../application/facades/CompanyFacade';
import { StaffFacade } from '../application/facades/StaffFacade';
import { InvoiceFacade } from '../application/facades/InvoiceFacade';
import { ProductFacade } from '../application/facades/ProductFacade';
import { ProjectFacade } from '../application/facades/ProjectFacade';
import { NotificationFacade } from '../application/facades/NotificationFacade';
import { SupportFacade } from '../application/facades/SupportFacade';
import { StorageFacade } from '../application/facades/StorageFacade';

import { ObserveSessionUseCase, RefreshSessionUseCase, SyncProfileUseCase } from '../application/usecases/auth/SessionUseCases';
import { ObserveAccessUseCase, AutoEnrollMemberUseCase } from '../application/usecases/access/AccessUseCases';
import { LoginUseCase } from '../application/usecases/auth/LoginUseCase';
import { LogoutUseCase } from '../application/usecases/auth/LogoutUseCase';
import { LoginWithGoogleUseCase } from '../application/usecases/auth/LoginWithGoogleUseCase';
import { RegisterUseCase } from '../application/usecases/auth/RegisterUseCase';

import { CreateCustomerUseCase } from '../application/usecases/customers/CreateCustomerUseCase';
import { UpdateCustomerUseCase } from '../application/usecases/customers/UpdateCustomerUseCase';
import { DeleteCustomerUseCase } from '../application/usecases/customers/DeleteCustomerUseCase';
import { GetCustomerUseCase } from '../application/usecases/customers/GetCustomerUseCase';
import { ListCustomerUseCase } from '../application/usecases/customers/ListCustomerUseCase';
import { ObserveCustomerUseCase } from '../application/usecases/customers/ObserveCustomerUseCase';

import { CreateCompanyUseCase } from '../application/usecases/companies/CreateCompanyUseCase';
import { UpdateCompanyUseCase } from '../application/usecases/companies/UpdateCompanyUseCase';
import { DeleteCompanyUseCase } from '../application/usecases/companies/DeleteCompanyUseCase';
import { GetCompanyUseCase } from '../application/usecases/companies/GetCompanyUseCase';
import { ListCompanyUseCase } from '../application/usecases/companies/ListCompanyUseCase';
import { ObserveCompanyUseCase } from '../application/usecases/companies/ObserveCompanyUseCase';

import { CreateStaffUseCase } from '../application/usecases/staff/CreateStaffUseCase';
import { UpdateStaffUseCase } from '../application/usecases/staff/UpdateStaffUseCase';
import { DeleteStaffUseCase } from '../application/usecases/staff/DeleteStaffUseCase';
import { GetStaffUseCase } from '../application/usecases/staff/GetStaffUseCase';
import { ListStaffUseCase } from '../application/usecases/staff/ListStaffUseCase';
import { ObserveStaffUseCase } from '../application/usecases/staff/ObserveStaffUseCase';

import { CreateInvoiceUseCase } from '../application/usecases/invoices/CreateInvoiceUseCase';
import { UpdateInvoiceUseCase } from '../application/usecases/invoices/UpdateInvoiceUseCase';
import { DeleteInvoiceUseCase } from '../application/usecases/invoices/DeleteInvoiceUseCase';
import { GetInvoiceUseCase } from '../application/usecases/invoices/GetInvoiceUseCase';
import { ListInvoiceUseCase } from '../application/usecases/invoices/ListInvoiceUseCase';
import { ObserveInvoiceUseCase } from '../application/usecases/invoices/ObserveInvoiceUseCase';

import { CreateProductUseCase } from '../application/usecases/products/CreateProductUseCase';
import { UpdateProductUseCase } from '../application/usecases/products/UpdateProductUseCase';
import { DeleteProductUseCase } from '../application/usecases/products/DeleteProductUseCase';
import { GetProductUseCase } from '../application/usecases/products/GetProductUseCase';
import { ListProductUseCase } from '../application/usecases/products/ListProductUseCase';
import { ObserveProductUseCase } from '../application/usecases/products/ObserveProductUseCase';

import { CreateProjectUseCase } from '../application/usecases/projects/CreateProjectUseCase';
import { ListProjectsUseCase } from '../application/usecases/projects/ListProjectsUseCase';

import { CreateNotificationUseCase } from '../application/usecases/notifications/CreateNotificationUseCase';
import { UpdateNotificationUseCase } from '../application/usecases/notifications/UpdateNotificationUseCase';
import { DeleteNotificationUseCase } from '../application/usecases/notifications/DeleteNotificationUseCase';
import { GetNotificationUseCase } from '../application/usecases/notifications/GetNotificationUseCase';
import { ListNotificationUseCase } from '../application/usecases/notifications/ListNotificationUseCase';
import { ObserveNotificationUseCase } from '../application/usecases/notifications/ObserveNotificationUseCase';

import { CreateTicketUseCase } from '../application/usecases/support/CreateTicketUseCase';
import { ObserveTicketsUseCase } from '../application/usecases/support/ObserveTicketsUseCase';

import { UploadFileUseCase } from '../application/usecases/storage/UploadFileUseCase';
import { DeleteFileUseCase } from '../application/usecases/storage/DeleteFileUseCase';
import { GetFileUrlUseCase } from '../application/usecases/storage/GetFileUrlUseCase';
import { ListFilesUseCase } from '../application/usecases/storage/ListFilesUseCase';

interface DependencyContainer {
  flags: FeatureFlags;
  logger: Logger;
  cache: CacheManager;
  sync: SyncService;
  health: HealthService;
  audit: AuditService;
  eventBus: EventBus;
  policies: {
    tenant: typeof TenantPolicy;
    auth: typeof AuthorizationPolicy;
  };
  gateways: {
    auth: AuthGateway;
    customer: CustomerGateway;
  };
  facades: {
    session: ISessionFacade;
    customer: ICustomerFacade;
    company: ICompanyFacade;
    staff: IStaffFacade;
    invoice: IInvoiceFacade;
    product: IProductFacade;
    project: IProjectFacade;
    notification: INotificationFacade;
    support: ISupportFacade;
    storage: IStorageFacade;
  };
  useCases: {
    auth: {
      login: LoginUseCase;
      logout: LogoutUseCase;
      loginWithGoogle: LoginWithGoogleUseCase;
      register: RegisterUseCase;
    };
  };
}

const DependencyContext = createContext<DependencyContainer | null>(null);

export const DependencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const container = useMemo<DependencyContainer>(() => {
    const authGateway = new AuthGateway();
    const customerGateway = new CustomerGateway();
    
    const customerRepo = new FirebaseCustomerRepository();
    const companyRepo = new FirebaseCompanyRepository();
    const staffRepo = new FirebaseStaffRepository();
    const invoiceRepo = new FirebaseInvoiceRepository();
    const productRepo = new FirebaseProductRepository();
    const projectRepo = new FirebaseProjectRepository();
    const notificationRepo = new FirebaseNotificationRepository();
    const supportRepo = new FirebaseSupportRepository();
    const storageRepo = new FirebaseStorageRepository();

    const observeSession = new ObserveSessionUseCase(authGateway);
    const refreshSession = new RefreshSessionUseCase(authGateway);
    const syncProfile = new SyncProfileUseCase(authGateway);
    const observeAccess = new ObserveAccessUseCase(null, null);
    const autoEnroll = new AutoEnrollMemberUseCase(null, null);

    const createProject = new CreateProjectUseCase(projectRepo);
    const listProjects = new ListProjectsUseCase(projectRepo);

    const createTicket = new CreateTicketUseCase(supportRepo);
    const observeTickets = new ObserveTicketsUseCase(supportRepo);

    return {
      flags: FeatureFlags.getInstance(),
      logger: Logger.getInstance(),
      cache: CacheManager.getInstance(),
      sync: SyncService.getInstance(),
      health: HealthService.getInstance(),
      audit: AuditService.getInstance(),
      eventBus: EventBus.getInstance(),
      policies: {
        tenant: TenantPolicy,
        auth: AuthorizationPolicy
      },
      gateways: {
        auth: authGateway,
        customer: customerGateway,
      },
      facades: {
        session: new SessionFacade(observeSession, refreshSession, syncProfile, observeAccess, autoEnroll, new LoginUseCase(authGateway), new LoginWithGoogleUseCase(authGateway), new RegisterUseCase(authGateway), authGateway),
        customer: new CustomerFacade(new CreateCustomerUseCase(customerRepo), new UpdateCustomerUseCase(customerRepo), new DeleteCustomerUseCase(customerRepo), new GetCustomerUseCase(customerRepo), new ListCustomerUseCase(customerRepo), new ObserveCustomerUseCase(customerRepo)),
        company: new CompanyFacade(new CreateCompanyUseCase(companyRepo), new UpdateCompanyUseCase(companyRepo), new DeleteCompanyUseCase(companyRepo), new GetCompanyUseCase(companyRepo), new ListCompanyUseCase(companyRepo), new ObserveCompanyUseCase(companyRepo)),
        staff: new StaffFacade(new CreateStaffUseCase(staffRepo), new UpdateStaffUseCase(staffRepo), new DeleteStaffUseCase(staffRepo), new GetStaffUseCase(staffRepo), new ListStaffUseCase(staffRepo), new ObserveStaffUseCase(staffRepo)),
        invoice: new InvoiceFacade(new CreateInvoiceUseCase(invoiceRepo), new UpdateInvoiceUseCase(invoiceRepo), new DeleteInvoiceUseCase(invoiceRepo), new GetInvoiceUseCase(invoiceRepo), new ListInvoiceUseCase(invoiceRepo), new ObserveInvoiceUseCase(invoiceRepo)),
        product: new ProductFacade(new CreateProductUseCase(productRepo), new UpdateProductUseCase(productRepo), new DeleteProductUseCase(productRepo), new GetProductUseCase(productRepo), new ListProductUseCase(productRepo), new ObserveProductUseCase(productRepo)),
        project: new ProjectFacade(createProject, null, null, null, listProjects, null),
        notification: new NotificationFacade(new CreateNotificationUseCase(notificationRepo), new UpdateNotificationUseCase(notificationRepo), new DeleteNotificationUseCase(notificationRepo), new GetNotificationUseCase(notificationRepo), new ListNotificationUseCase(notificationRepo), new ObserveNotificationUseCase(notificationRepo)),
        support: new SupportFacade(createTicket, null, null, null, null, observeTickets),
        storage: new StorageFacade(new UploadFileUseCase(storageRepo), new DeleteFileUseCase(storageRepo), new GetFileUrlUseCase(storageRepo), new ListFilesUseCase(storageRepo))
      },
      useCases: {
        auth: {
          login: new LoginUseCase(authGateway),
          logout: new LogoutUseCase(authGateway),
          loginWithGoogle: new LoginWithGoogleUseCase(authGateway),
          register: new RegisterUseCase(authGateway),
        }
      }
    };
  }, []);

  return (
    <DependencyContext.Provider value={container}>
      {children}
    </DependencyContext.Provider>
  );
};

export const useDependencies = () => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error('useDependencies must be used within a DependencyProvider');
  }
  return context;
};
`;

fs.writeFileSync('src/core/di/DependencyProvider.tsx', deps);
