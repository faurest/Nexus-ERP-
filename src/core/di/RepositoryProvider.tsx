import React, { createContext, useContext, useMemo } from 'react';
import { IAuthRepository } from '../domain/repositories/IAuthRepository';
import { ICompanyRepository } from '../domain/repositories/ICompanyRepository';
import { ICustomerRepository } from '../domain/repositories/ICustomerRepository';
import { IStaffRepository } from '../domain/repositories/IStaffRepository';
import { IInvoiceRepository } from '../domain/repositories/IInvoiceRepository';
import { IProductRepository } from '../domain/repositories/IProductRepository';
import { ITaskRepository } from '../domain/repositories/ITaskRepository';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { IStorageRepository } from '../domain/repositories/IStorageRepository';

import { FirebaseAuthRepository } from '../infrastructure/firebase/FirebaseAuthRepository';
import { FirebaseCompanyRepository } from '../infrastructure/firebase/FirebaseCompanyRepository';
import { FirebaseCustomerRepository } from '../infrastructure/firebase/FirebaseCustomerRepository';
import { FirebaseStaffRepository } from '../infrastructure/firebase/FirebaseStaffRepository';
import { FirebaseInvoiceRepository } from '../infrastructure/firebase/FirebaseInvoiceRepository';
import { FirebaseProductRepository } from '../infrastructure/firebase/FirebaseProductRepository';
import { FirebaseTaskRepository } from '../infrastructure/firebase/FirebaseTaskRepository';
import { FirebaseNotificationRepository } from '../infrastructure/firebase/FirebaseNotificationRepository';
import { FirebaseStorageRepository } from '../infrastructure/firebase/FirebaseStorageRepository';

interface Repositories {
  auth: IAuthRepository;
  company: ICompanyRepository;
  customer: ICustomerRepository;
  staff: IStaffRepository;
  invoice: IInvoiceRepository;
  product: IProductRepository;
  task: ITaskRepository;
  notification: INotificationRepository;
  storage: IStorageRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repositories = useMemo<Repositories>(() => ({
    auth: new FirebaseAuthRepository(),
    company: new FirebaseCompanyRepository(),
    customer: new FirebaseCustomerRepository(),
    staff: new FirebaseStaffRepository(),
    invoice: new FirebaseInvoiceRepository(),
    product: new FirebaseProductRepository(),
    task: new FirebaseTaskRepository(),
    notification: new FirebaseNotificationRepository(),
    storage: new FirebaseStorageRepository()
  }), []);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositories = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
};
