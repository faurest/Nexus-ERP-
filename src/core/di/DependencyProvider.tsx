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
    
    const observeSession = new ObserveSessionUseCase(authGateway);
    const refreshSession = new RefreshSessionUseCase(authGateway);
    const syncProfile = new SyncProfileUseCase(authGateway);
    const observeAccess = new ObserveAccessUseCase(null, null);
    const autoEnroll = new AutoEnrollMemberUseCase(null, null);

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
        customer: new CustomerFacade(null, null, null, null, null, null),
        company: new CompanyFacade(null, null, null, null, null, null),
        staff: new StaffFacade(null, null, null, null, null, null),
        invoice: new InvoiceFacade(null, null, null, null, null, null),
        product: new ProductFacade(null, null, null, null, null, null),
        project: new ProjectFacade(null, null, null, null, null, null),
        notification: new NotificationFacade(null, null, null, null, null, null),
        support: new SupportFacade(null, null, null, null, null, null),
        storage: new StorageFacade(null, null, null, null)
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
