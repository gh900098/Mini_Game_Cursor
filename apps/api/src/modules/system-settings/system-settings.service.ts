import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepository: Repository<SystemSetting>,
  ) {}

  async getSetting(key: string): Promise<any> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async setSetting(key: string, value: any): Promise<SystemSetting> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingsRepository.create({ key, value });
    }
    return this.settingsRepository.save(setting);
  }

  async getAllSettings(): Promise<Record<string, any>> {
    const settings = await this.settingsRepository.find();
    return settings.reduce(
      (acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  async getPublicSettings(): Promise<Record<string, any>> {
    const publicKeys = ['EMAIL_VERIFICATION_REQUIRED'];
    const settings = await this.settingsRepository.find();
    return settings
      .filter((s) => publicKeys.includes(s.key))
      .reduce(
        (acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        },
        {} as Record<string, any>,
      );
  }
}
