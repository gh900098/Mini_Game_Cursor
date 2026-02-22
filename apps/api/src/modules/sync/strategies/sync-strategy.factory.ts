import { Injectable, BadRequestException } from '@nestjs/common';
import { SyncStrategy } from './sync.strategy.interface';
import { JkSyncStrategy } from './jk.strategy';

@Injectable()
export class SyncStrategyFactory {
    constructor(
        private readonly jkStrategy: JkSyncStrategy,
        // Inject other strategies here in the future
    ) { }

    getStrategy(provider: string): SyncStrategy {
        switch (provider?.toUpperCase()) {
            case 'JK':
                return this.jkStrategy;
            // case 'OTHER': return this.otherStrategy;
            default:
                throw new BadRequestException(`Unsupported sync provider: ${provider}`);
        }
    }
}
