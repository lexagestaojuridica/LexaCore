/**
 * Interfaces fundamentais para desacoplamento de infraestrutura.
 * O objetivo é que o core da aplicação não conheça detalhes do ambiente de hospedagem.
 */

export interface ICacheSettings {
    revalidate?: number | false;
    tags?: string[];
}

export interface IInfrastructureProvider {
    /**
     * Identifica o host atual.
     */
    readonly name: string;

    /**
     * Retorna a URL base da aplicação no ambiente atual.
     */
    getBaseUrl(): string;

    /**
     * Configurações de cache específicas do host (se houver abstração necessária).
     */
    getCacheConfig(settings: ICacheSettings): any;

    /**
     * Lógica para lidar com Edge Middleware de forma agnóstica.
     */
    isEdge(): boolean;
}

// Singleton helper para acessar o provedor atual
let currentProvider: IInfrastructureProvider | null = null;

export function getInfrastructure(): IInfrastructureProvider {
    if (!currentProvider) {
        throw new Error('Infrastructure provider not initialized');
    }
    return currentProvider;
}

export function setInfrastructure(provider: IInfrastructureProvider) {
    currentProvider = provider;
}
