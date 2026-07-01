import { useMemo } from 'react';
import { useRepositories } from '../../core/di/RepositoryProvider';
import { CompanyUseCases } from '../../core/application/usecases/CompanyUseCases';

export const useCompanyUseCases = () => {
  const { company } = useRepositories();
  return useMemo(() => new CompanyUseCases(company), [company]);
};
