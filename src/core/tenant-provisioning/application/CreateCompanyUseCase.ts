import { ProvisioningOrchestrator } from '../orchestration/ProvisioningOrchestrator';

/**
 * UseCase wrapping the Orchestrator for use by APIs or Client components.
 */
export class CreateCompanyUseCase {
  static async execute(request: { name: string; userId: string; userEmail: string }): Promise<string> {
    console.log(`[CreateCompanyUseCase] Initiating company creation for: ${request.name}`);
    return await ProvisioningOrchestrator.provisionNewTenant(request.name, request.userId, request.userEmail);
  }
}
