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
            imageSpec?: {
                assets: Array<{ name: string; size: string; format: string; note: string; mappingKey?: string; category?: string }>;
                performanceTips: string[];
            };
            createdAt: string;
            updatedAt: string;
        }
    }
}
