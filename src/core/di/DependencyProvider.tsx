import React, { createContext, useContext, useMemo } from 'react';
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
import { AccessGateway } from '../infrastructure/gateways/AccessGateway';

import { FirebaseCustomerRepository } from '../infrastructure/firebase/FirebaseCustomerRepository';
import { FirebaseCompanyRepository } from '../infrastructure/firebase/FirebaseCompanyRepository';
import { FirebaseStaffRepository } from '../infrastructure/firebase/FirebaseStaffRepository';
import { FirebaseInvoiceRepository } from '../infrastructure/firebase/FirebaseInvoiceRepository';
import { FirebaseProductRepository } from '../infrastructure/firebase/FirebaseProductRepository';

import { PartnerGateway } from '../infrastructure/gateways/PartnerGateway';
import { ExpenseGateway } from '../infrastructure/gateways/ExpenseGateway';
import { PaymentGateway } from '../infrastructure/gateways/PaymentGateway';

import { CreatePartnerUseCase } from '../application/usecases/partners/CreatePartnerUseCase';
import { UpdatePartnerUseCase } from '../application/usecases/partners/UpdatePartnerUseCase';
import { DeletePartnerUseCase } from '../application/usecases/partners/DeletePartnerUseCase';
import { GetPartnerUseCase } from '../application/usecases/partners/GetPartnerUseCase';
import { ListPartnersUseCase } from '../application/usecases/partners/ListPartnersUseCase';
import { ObservePartnersUseCase } from '../application/usecases/partners/ObservePartnersUseCase';

import { CreateExpenseUseCase } from '../application/usecases/finance/CreateExpenseUseCase';
import { UpdateExpenseUseCase } from '../application/usecases/finance/UpdateExpenseUseCase';
import { DeleteExpenseUseCase } from '../application/usecases/finance/DeleteExpenseUseCase';
import { ObserveExpensesUseCase } from '../application/usecases/finance/ObserveExpensesUseCase';

import { CreatePaymentUseCase } from '../application/usecases/finance/CreatePaymentUseCase';
import { UpdatePaymentUseCase } from '../application/usecases/finance/UpdatePaymentUseCase';
import { DeletePaymentUseCase } from '../application/usecases/finance/DeletePaymentUseCase';
import { ObservePaymentsUseCase } from '../application/usecases/finance/ObservePaymentsUseCase';


// Personnel domains
import { FirebaseTaskRepository } from '../infrastructure/firebase/FirebaseTaskRepository';
import { FirebaseLeaveRequestRepository } from '../infrastructure/firebase/FirebaseLeaveRequestRepository';
import { FirebaseTimeEntryRepository } from '../infrastructure/firebase/FirebaseTimeEntryRepository';
import { FirebaseSalaryAdvanceRepository } from '../infrastructure/firebase/FirebaseSalaryAdvanceRepository';

import { TaskFacade } from '../application/facades/TaskFacade';
import { LeaveRequestFacade } from '../application/facades/LeaveRequestFacade';
import { TimeEntryFacade } from '../application/facades/TimeEntryFacade';
import { SalaryAdvanceFacade } from '../application/facades/SalaryAdvanceFacade';

import { ITaskFacade } from '../application/interfaces/ITaskFacade';
import { ILeaveRequestFacade } from '../application/interfaces/ILeaveRequestFacade';
import { ITimeEntryFacade } from '../application/interfaces/ITimeEntryFacade';
import { ISalaryAdvanceFacade } from '../application/interfaces/ISalaryAdvanceFacade';

import { CreateTaskUseCase } from '../application/usecases/tasks/CreateTaskUseCase';
import { UpdateTaskUseCase } from '../application/usecases/tasks/UpdateTaskUseCase';
import { DeleteTaskUseCase } from '../application/usecases/tasks/DeleteTaskUseCase';
import { GetTaskUseCase } from '../application/usecases/tasks/GetTaskUseCase';
import { ListTasksUseCase } from '../application/usecases/tasks/ListTasksUseCase';
import { ObserveTasksUseCase } from '../application/usecases/tasks/ObserveTasksUseCase';

import { CreateLeaveRequestUseCase } from '../application/usecases/leave_requests/CreateLeaveRequestUseCase';
import { UpdateLeaveRequestUseCase } from '../application/usecases/leave_requests/UpdateLeaveRequestUseCase';
import { DeleteLeaveRequestUseCase } from '../application/usecases/leave_requests/DeleteLeaveRequestUseCase';
import { GetLeaveRequestUseCase } from '../application/usecases/leave_requests/GetLeaveRequestUseCase';
import { ListLeaveRequestsUseCase } from '../application/usecases/leave_requests/ListLeaveRequestsUseCase';
import { ObserveLeaveRequestsUseCase } from '../application/usecases/leave_requests/ObserveLeaveRequestsUseCase';

import { CreateTimeEntryUseCase } from '../application/usecases/time_entries/CreateTimeEntryUseCase';
import { UpdateTimeEntryUseCase } from '../application/usecases/time_entries/UpdateTimeEntryUseCase';
import { DeleteTimeEntryUseCase } from '../application/usecases/time_entries/DeleteTimeEntryUseCase';
import { GetTimeEntryUseCase } from '../application/usecases/time_entries/GetTimeEntryUseCase';
import { ListTimeEntriesUseCase } from '../application/usecases/time_entries/ListTimeEntriesUseCase';
import { ObserveTimeEntriesUseCase } from '../application/usecases/time_entries/ObserveTimeEntriesUseCase';

import { CreateSalaryAdvanceUseCase } from '../application/usecases/salary_advances/CreateSalaryAdvanceUseCase';
import { UpdateSalaryAdvanceUseCase } from '../application/usecases/salary_advances/UpdateSalaryAdvanceUseCase';
import { DeleteSalaryAdvanceUseCase } from '../application/usecases/salary_advances/DeleteSalaryAdvanceUseCase';
import { GetSalaryAdvanceUseCase } from '../application/usecases/salary_advances/GetSalaryAdvanceUseCase';
import { ListSalaryAdvancesUseCase } from '../application/usecases/salary_advances/ListSalaryAdvancesUseCase';
import { ObserveSalaryAdvancesUseCase } from '../application/usecases/salary_advances/ObserveSalaryAdvancesUseCase';


import { FirebaseUserRepository } from '../infrastructure/firebase/FirebaseUserRepository';
import { UserFacade } from '../application/facades/UserFacade';
import { IUserFacade } from '../application/interfaces/IUserFacade';
import { CreateUserUseCase } from '../application/usecases/users/CreateUserUseCase';
import { GetUserByEmailUseCase } from '../application/usecases/users/GetUserByEmailUseCase';
import { RegisterUserWithoutLoginUseCase } from '../application/usecases/auth/RegisterUserWithoutLoginUseCase';
import { AddCompanyMemberEmailUseCase } from '../application/usecases/company/AddCompanyMemberEmailUseCase';

import { FirebaseProjectRepository } from '../infrastructure/firebase/FirebaseProjectRepository';
import { FirebasePartnerRepository } from '../infrastructure/firebase/FirebasePartnerRepository';
import { FirebaseExpenseRepository } from '../infrastructure/firebase/FirebaseExpenseRepository';
import { FirebasePaymentRepository } from '../infrastructure/firebase/FirebasePaymentRepository';
import { FirebaseNotificationRepository } from '../infrastructure/firebase/FirebaseNotificationRepository';
import { FirebaseSupportRepository } from '../infrastructure/firebase/FirebaseSupportRepository';
import { FirebaseStorageRepository } from '../infrastructure/firebase/FirebaseStorageRepository';
import { FirebaseAccessRepository } from '../infrastructure/firebase/FirebaseAccessRepository';

import { ISessionFacade } from '../application/interfaces/ISessionFacade';
import { ICustomerFacade } from '../application/interfaces/ICustomerFacade';
import { ICompanyFacade } from '../application/interfaces/ICompanyFacade';
import { IStaffFacade } from '../application/interfaces/IStaffFacade';
import { IInvoiceFacade } from '../application/interfaces/IInvoiceFacade';
import { IProductFacade } from '../application/interfaces/IProductFacade';
import { IProjectFacade } from '../application/interfaces/IProjectFacade';
import { IPartnerFacade } from '../application/interfaces/IPartnerFacade';
import { IFinanceFacade } from '../application/interfaces/IFinanceFacade';
import { INotificationFacade } from '../application/interfaces/INotificationFacade';
import { ISupportFacade } from '../application/interfaces/ISupportFacade';
import { IStorageFacade } from '../application/interfaces/IStorageFacade';
import { IAccessFacade } from '../application/interfaces/IAccessFacade';

import { SessionFacade } from '../application/facades/SessionFacade';
import { CustomerFacade } from '../application/facades/CustomerFacade';
import { CompanyFacade } from '../application/facades/CompanyFacade';
import { StaffFacade } from '../application/facades/StaffFacade';
import { InvoiceFacade } from '../application/facades/InvoiceFacade';
import { ProductFacade } from '../application/facades/ProductFacade';
import { ProjectFacade } from '../application/facades/ProjectFacade';
import { PartnerFacade } from '../application/facades/PartnerFacade';
import { FinanceFacade } from '../application/facades/FinanceFacade';
import { NotificationFacade } from '../application/facades/NotificationFacade';
import { SupportFacade } from '../application/facades/SupportFacade';
import { StorageFacade } from '../application/facades/StorageFacade';
import { AccessFacade } from '../application/facades/AccessFacade';

import { ObserveSessionUseCase, RefreshSessionUseCase, SyncProfileUseCase } from '../application/usecases/auth/SessionUseCases';
import { ObserveAccessUseCase, AutoEnrollMemberUseCase, ValidateWhitelistUseCase } from '../application/usecases/access/AccessUseCases';
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

import { ISaleFacade } from '../application/interfaces/ISaleFacade';
import { IResourceFacade } from '../application/interfaces/IResourceFacade';
import { IServiceFacade } from '../application/interfaces/IServiceFacade';
import { IOpenOrderFacade } from '../application/interfaces/IOpenOrderFacade';

import { SaleFacade } from '../application/facades/SaleFacade';
import { ResourceFacade } from '../application/facades/ResourceFacade';
import { ServiceFacade } from '../application/facades/ServiceFacade';
import { OpenOrderFacade } from '../application/facades/OpenOrderFacade';

import { FirebaseSaleRepository } from '../infrastructure/firebase/FirebaseSaleRepository';
import { FirebaseResourceRepository } from '../infrastructure/firebase/FirebaseResourceRepository';
import { FirebaseServiceRepository } from '../infrastructure/firebase/FirebaseServiceRepository';
import { FirebaseOpenOrderRepository } from '../infrastructure/firebase/FirebaseOpenOrderRepository';

import { CreateSaleUseCase } from '../application/usecases/sales/CreateSaleUseCase';
import { UpdateSaleUseCase } from '../application/usecases/sales/UpdateSaleUseCase';
import { DeleteSaleUseCase } from '../application/usecases/sales/DeleteSaleUseCase';
import { GetSaleUseCase } from '../application/usecases/sales/GetSaleUseCase';
import { ListSalesUseCase } from '../application/usecases/sales/ListSalesUseCase';
import { ObserveSalesUseCase } from '../application/usecases/sales/ObserveSalesUseCase';

import { CreateResourceUseCase } from '../application/usecases/resources/CreateResourceUseCase';
import { UpdateResourceUseCase } from '../application/usecases/resources/UpdateResourceUseCase';
import { DeleteResourceUseCase } from '../application/usecases/resources/DeleteResourceUseCase';
import { GetResourceUseCase } from '../application/usecases/resources/GetResourceUseCase';
import { ListResourcesUseCase } from '../application/usecases/resources/ListResourcesUseCase';
import { ObserveResourcesUseCase } from '../application/usecases/resources/ObserveResourcesUseCase';

import { CreateServiceUseCase } from '../application/usecases/services/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../application/usecases/services/UpdateServiceUseCase';
import { DeleteServiceUseCase } from '../application/usecases/services/DeleteServiceUseCase';
import { GetServiceUseCase } from '../application/usecases/services/GetServiceUseCase';
import { ListServicesUseCase } from '../application/usecases/services/ListServicesUseCase';
import { ObserveServicesUseCase } from '../application/usecases/services/ObserveServicesUseCase';

import { CreateOpenOrderUseCase } from '../application/usecases/open_orders/CreateOpenOrderUseCase';
import { UpdateOpenOrderUseCase } from '../application/usecases/open_orders/UpdateOpenOrderUseCase';
import { DeleteOpenOrderUseCase } from '../application/usecases/open_orders/DeleteOpenOrderUseCase';
import { GetOpenOrderUseCase } from '../application/usecases/open_orders/GetOpenOrderUseCase';
import { ListOpenOrdersUseCase } from '../application/usecases/open_orders/ListOpenOrdersUseCase';
import { ObserveOpenOrdersUseCase } from '../application/usecases/open_orders/ObserveOpenOrdersUseCase';


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
    access: AccessGateway;
  };
  facades: {
    session: ISessionFacade;
    access: IAccessFacade;
    customer: ICustomerFacade;
    company: ICompanyFacade;
    user: IUserFacade;
    staff: IStaffFacade;
    invoice: IInvoiceFacade;
    product: IProductFacade;
    project: IProjectFacade;
    partner: IPartnerFacade;
    finance: IFinanceFacade;
    notification: INotificationFacade;
    support: ISupportFacade;
    storage: IStorageFacade;
    sale: ISaleFacade;
    resource: IResourceFacade;
    service: IServiceFacade;
    openOrder: IOpenOrderFacade;
    task: ITaskFacade;
    leaveRequest: ILeaveRequestFacade;
    timeEntry: ITimeEntryFacade;
    salaryAdvance: ISalaryAdvanceFacade;

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
    const accessGateway = new AccessGateway();
    
    const customerRepo = new FirebaseCustomerRepository();
    const companyRepo = new FirebaseCompanyRepository();
    const staffRepo = new FirebaseStaffRepository();
    const invoiceRepo = new FirebaseInvoiceRepository();
    const productRepo = new FirebaseProductRepository();
    
  const taskRepo = new FirebaseTaskRepository();
  const leaveRequestRepo = new FirebaseLeaveRequestRepository();
  const timeEntryRepo = new FirebaseTimeEntryRepository();
  const salaryAdvanceRepo = new FirebaseSalaryAdvanceRepository();
  const userRepo = new FirebaseUserRepository();

  const projectRepo = new FirebaseProjectRepository();

    const partnerRepo = new FirebasePartnerRepository();
    const expenseRepo = new FirebaseExpenseRepository();
    const paymentRepo = new FirebasePaymentRepository();

    const partnerGateway = new PartnerGateway(partnerRepo);
    const expenseGateway = new ExpenseGateway(expenseRepo);
    const paymentGateway = new PaymentGateway(paymentRepo);

    const notificationRepo = new FirebaseNotificationRepository();
    const supportRepo = new FirebaseSupportRepository();
    const storageRepo = new FirebaseStorageRepository();
    const saleRepo = new FirebaseSaleRepository();
    const resourceRepo = new FirebaseResourceRepository();
    const serviceRepo = new FirebaseServiceRepository();
    const openOrderRepo = new FirebaseOpenOrderRepository();


    const observeSession = new ObserveSessionUseCase(authGateway);
    const refreshSession = new RefreshSessionUseCase(authGateway);
    const syncProfile = new SyncProfileUseCase(accessGateway);
    const observeAccess = new ObserveAccessUseCase(staffRepo, customerRepo);
    const autoEnroll = new AutoEnrollMemberUseCase(companyRepo, staffRepo);
    const validateWhitelist = new ValidateWhitelistUseCase(accessGateway);

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
        access: accessGateway,
      },
      facades: {
        session: new SessionFacade(observeSession, refreshSession, syncProfile, new LoginUseCase(authGateway), new LoginWithGoogleUseCase(authGateway), new RegisterUseCase(authGateway),
          new RegisterUserWithoutLoginUseCase(authGateway),
          authGateway),
        access: new AccessFacade(observeAccess, autoEnroll, validateWhitelist),
        customer: new CustomerFacade(new CreateCustomerUseCase(customerRepo), new UpdateCustomerUseCase(customerRepo), new DeleteCustomerUseCase(customerRepo), new GetCustomerUseCase(customerRepo), new ListCustomerUseCase(customerRepo), new ObserveCustomerUseCase(customerRepo)),
        company: new CompanyFacade(new CreateCompanyUseCase(companyRepo), new UpdateCompanyUseCase(companyRepo), new DeleteCompanyUseCase(companyRepo), new GetCompanyUseCase(companyRepo), new ListCompanyUseCase(companyRepo), new ObserveCompanyUseCase(companyRepo),
          new AddCompanyMemberEmailUseCase(companyRepo)),
        
        user: new UserFacade(
          new CreateUserUseCase(userRepo),
          new GetUserByEmailUseCase(userRepo)
        ),
        staff: new StaffFacade(new CreateStaffUseCase(staffRepo), new UpdateStaffUseCase(staffRepo), new DeleteStaffUseCase(staffRepo), new GetStaffUseCase(staffRepo), new ListStaffUseCase(staffRepo), new ObserveStaffUseCase(staffRepo)),
        invoice: new InvoiceFacade(new CreateInvoiceUseCase(invoiceRepo), new UpdateInvoiceUseCase(invoiceRepo), new DeleteInvoiceUseCase(invoiceRepo), new GetInvoiceUseCase(invoiceRepo), new ListInvoiceUseCase(invoiceRepo), new ObserveInvoiceUseCase(invoiceRepo)),
        product: new ProductFacade(new CreateProductUseCase(productRepo), new UpdateProductUseCase(productRepo), new DeleteProductUseCase(productRepo), new GetProductUseCase(productRepo), new ListProductUseCase(productRepo), new ObserveProductUseCase(productRepo)),
        project: new ProjectFacade(createProject, null, null, null, listProjects, null, projectRepo),

        partner: new PartnerFacade(
          new CreatePartnerUseCase(partnerGateway),
          new UpdatePartnerUseCase(partnerGateway),
          new DeletePartnerUseCase(partnerGateway),
          new GetPartnerUseCase(partnerGateway),
          new ListPartnersUseCase(partnerGateway),
          new ObservePartnersUseCase(partnerGateway)
        ),
        finance: new FinanceFacade(
          new CreateExpenseUseCase(expenseGateway),
          new UpdateExpenseUseCase(expenseGateway),
          new DeleteExpenseUseCase(expenseGateway),
          new ObserveExpensesUseCase(expenseGateway),
          new CreatePaymentUseCase(paymentGateway),
          new UpdatePaymentUseCase(paymentGateway),
          new DeletePaymentUseCase(paymentGateway),
          new ObservePaymentsUseCase(paymentGateway)
        ),

        notification: new NotificationFacade(new CreateNotificationUseCase(notificationRepo), new UpdateNotificationUseCase(notificationRepo), new DeleteNotificationUseCase(notificationRepo), new GetNotificationUseCase(notificationRepo), new ListNotificationUseCase(notificationRepo), new ObserveNotificationUseCase(notificationRepo)),
        support: new SupportFacade(createTicket, null, null, null, null, observeTickets),
        sale: new SaleFacade(new CreateSaleUseCase(saleRepo), new UpdateSaleUseCase(saleRepo), new DeleteSaleUseCase(saleRepo), new GetSaleUseCase(saleRepo), new ListSalesUseCase(saleRepo), new ObserveSalesUseCase(saleRepo)),
        resource: new ResourceFacade(new CreateResourceUseCase(resourceRepo), new UpdateResourceUseCase(resourceRepo), new DeleteResourceUseCase(resourceRepo), new GetResourceUseCase(resourceRepo), new ListResourcesUseCase(resourceRepo), new ObserveResourcesUseCase(resourceRepo)),
        service: new ServiceFacade(new CreateServiceUseCase(serviceRepo), new UpdateServiceUseCase(serviceRepo), new DeleteServiceUseCase(serviceRepo), new GetServiceUseCase(serviceRepo), new ListServicesUseCase(serviceRepo), new ObserveServicesUseCase(serviceRepo)),
        
        task: new TaskFacade(
          new CreateTaskUseCase(taskRepo),
          new UpdateTaskUseCase(taskRepo),
          new DeleteTaskUseCase(taskRepo),
          new GetTaskUseCase(taskRepo),
          new ListTasksUseCase(taskRepo),
          new ObserveTasksUseCase(taskRepo)
        ),
        leaveRequest: new LeaveRequestFacade(
          new CreateLeaveRequestUseCase(leaveRequestRepo),
          new UpdateLeaveRequestUseCase(leaveRequestRepo),
          new DeleteLeaveRequestUseCase(leaveRequestRepo),
          new GetLeaveRequestUseCase(leaveRequestRepo),
          new ListLeaveRequestsUseCase(leaveRequestRepo),
          new ObserveLeaveRequestsUseCase(leaveRequestRepo)
        ),
        timeEntry: new TimeEntryFacade(
          new CreateTimeEntryUseCase(timeEntryRepo),
          new UpdateTimeEntryUseCase(timeEntryRepo),
          new DeleteTimeEntryUseCase(timeEntryRepo),
          new GetTimeEntryUseCase(timeEntryRepo),
          new ListTimeEntriesUseCase(timeEntryRepo),
          new ObserveTimeEntriesUseCase(timeEntryRepo)
        ),
        salaryAdvance: new SalaryAdvanceFacade(
          new CreateSalaryAdvanceUseCase(salaryAdvanceRepo),
          new UpdateSalaryAdvanceUseCase(salaryAdvanceRepo),
          new DeleteSalaryAdvanceUseCase(salaryAdvanceRepo),
          new GetSalaryAdvanceUseCase(salaryAdvanceRepo),
          new ListSalaryAdvancesUseCase(salaryAdvanceRepo),
          new ObserveSalaryAdvancesUseCase(salaryAdvanceRepo)
        ),

        openOrder: new OpenOrderFacade(new CreateOpenOrderUseCase(openOrderRepo), new UpdateOpenOrderUseCase(openOrderRepo), new DeleteOpenOrderUseCase(openOrderRepo), new GetOpenOrderUseCase(openOrderRepo), new ListOpenOrdersUseCase(openOrderRepo), new ObserveOpenOrdersUseCase(openOrderRepo)),
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
