import { useMemo } from 'react';
import { useRepositories } from '../../core/di/RepositoryProvider';
import { ProductUseCases } from '../../core/application/usecases/ProductUseCases';

export const useProductUseCases = () => {
  const { product } = useRepositories();
  return useMemo(() => new ProductUseCases(product), [product]);
};
