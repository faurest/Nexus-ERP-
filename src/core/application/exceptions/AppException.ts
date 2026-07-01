export class AppException extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RepositoryException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'REPOSITORY_ERROR', originalError);
  }
}

export class ValidationException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'VALIDATION_ERROR', originalError);
  }
}

export class PermissionException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'PERMISSION_DENIED', originalError);
  }
}

export class NotFoundException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'NOT_FOUND', originalError);
  }
}

export class AuthenticationException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'AUTHENTICATION_ERROR', originalError);
  }
}

export class NetworkException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'NETWORK_ERROR', originalError);
  }
}

export class SyncException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'SYNC_ERROR', originalError);
  }
}

export class ConflictException extends AppException {
  constructor(message: string, originalError?: any) {
    super(message, 'CONFLICT_ERROR', originalError);
  }
}
