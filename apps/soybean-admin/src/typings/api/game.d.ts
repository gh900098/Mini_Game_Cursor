declare namespace Api {
    namespace Game {
        interface Game {
            id: string;
            name: string;
            slug: string;
            description?: string;
            type: string;
            thumbnailUrl?: string;
            baseWidth?: number;
            baseHeight?: number;
            isPortrait?: boolean;
            isActive: boolean;
            config?: any;
            configSchema?: any;
            createdAt: string;
            updatedAt: string;
        }
    }
}
