import { useMemo } from 'react';
import { useRepositories } from '../../core/di/RepositoryProvider';
import { AuthUseCases } from '../../core/application/usecases/AuthUseCases';

export const useAuthUseCases = () => {
  const { auth } = useRepositories();
  return useMemo(() => new AuthUseCases(auth), [auth]);
};
