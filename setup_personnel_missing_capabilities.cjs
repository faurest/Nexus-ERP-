const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  const fullPath = path.join(__dirname, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n');
};

// 1. User Repository
write('src/core/domain/repositories/IUserRepository.ts', `
export interface IUserRepository {
  createUser(email: string, data: any): Promise<void>;
  getUserByEmail(email: string): Promise<any>;
}
`);

// 2. Firebase User Repository
write('src/core/infrastructure/firebase/FirebaseUserRepository.ts', `
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../../lib/firebase';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class FirebaseUserRepository implements IUserRepository {
  async createUser(email: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, 'users', email);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      throw error;
    }
  }
}
`);

// 3. User Use Cases
write('src/core/application/usecases/users/CreateUserUseCase.ts', `
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
export class CreateUserUseCase {
  constructor(private repository: IUserRepository) {}
  async execute(email: string, data: any): Promise<void> {
    return this.repository.createUser(email, data);
  }
}
`);

write('src/core/application/usecases/users/GetUserByEmailUseCase.ts', `
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
export class GetUserByEmailUseCase {
  constructor(private repository: IUserRepository) {}
  async execute(email: string): Promise<any> {
    return this.repository.getUserByEmail(email);
  }
}
`);

// 4. User Facade
write('src/core/application/interfaces/IUserFacade.ts', `
export interface IUserFacade {
  createUser(email: string, data: any): Promise<void>;
  getUserByEmail(email: string): Promise<any>;
}
`);

write('src/core/application/facades/UserFacade.ts', `
import { IUserFacade } from '../interfaces/IUserFacade';
import { CreateUserUseCase } from '../usecases/users/CreateUserUseCase';
import { GetUserByEmailUseCase } from '../usecases/users/GetUserByEmailUseCase';

export class UserFacade implements IUserFacade {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private getUserByEmailUseCase: GetUserByEmailUseCase
  ) {}

  async createUser(email: string, data: any): Promise<void> {
    return this.createUserUseCase.execute(email, data);
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.getUserByEmailUseCase.execute(email);
  }
}
`);

// 5. AuthUseCase for registerUserWithoutLogin
write('src/core/application/usecases/auth/RegisterUserWithoutLoginUseCase.ts', `
export class RegisterUserWithoutLoginUseCase {
  constructor(private authGateway: any) {}
  async execute(email: string, pass: string): Promise<any> {
    if (this.authGateway.registerWithoutLogin) {
      return this.authGateway.registerWithoutLogin(email, pass);
    }
    throw new Error('registerWithoutLogin not implemented in gateway');
  }
}
`);

console.log('Foundation files for Users and Auth generated.');
