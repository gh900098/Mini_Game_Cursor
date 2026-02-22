export interface SyncStrategy {
    /**
     * Executes the synchronization logic for a specific integration.
     * @param companyId The ID of the company performing the sync.
     * @param config The specific configuration for this integration provider.
     * @param syncParams Optional extra parameters passed to the sync operation.
     */
    execute(companyId: string, config: any, syncParams?: Record<string, any>): Promise<any>;
}
