import { useMemo } from 'react';
import { useRepositories } from '../../core/di/RepositoryProvider';
import { CustomerUseCases } from '../../core/application/usecases/CustomerUseCases';

export const useCustomerUseCases = () => {
  const { customer } = useRepositories();
  return useMemo(() => new CustomerUseCases(customer), [customer]);
};
