import { Customer } from '../../domain/models';
import { CreateCustomerDto } from '../dto';

export abstract class BaseMapper<TDomain, TDto, TPersistence> {
  abstract toDomain(raw: TPersistence): TDomain;
  abstract toDto(domain: TDomain): TDto;
  abstract toPersistence(domain: TDomain): TPersistence;
}

export class CustomerMapper extends BaseMapper<Customer, any, any> {
  toDomain(raw: any): Customer {
    return {
      id: raw.id,
      companyId: raw.companyId,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      type: raw.type || 'individual',
      createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate() : new Date(raw.createdAt),
      updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate() : new Date(raw.updatedAt),
      version: raw.version || 1
    };
  }

  toDto(domain: Customer): any {
    return {
      id: domain.id,
      name: domain.name,
      email: domain.email,
    };
  }

  toPersistence(domain: Customer): any {
    return {
      ...domain,
      updatedAt: new Date(),
    };
  }
}
