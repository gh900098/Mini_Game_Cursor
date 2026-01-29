import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCompaniesService } from './user-companies.service';
import { UserCompaniesController } from './user-companies.controller';
import { UserCompany } from './entities/user-company.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Role } from '../roles/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCompany, User, Company, Role])],
  controllers: [UserCompaniesController],
  providers: [UserCompaniesService],
  exports: [UserCompaniesService],
})
export class UserCompaniesModule { }
