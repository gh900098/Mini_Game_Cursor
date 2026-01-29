import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';

@Injectable()
export class MembersService {
    constructor(
        @InjectRepository(Member)
        private readonly memberRepository: Repository<Member>,
    ) { }

    async findOrCreateExternalMember(companyId: string, externalId: string, username?: string): Promise<Member> {
        let member = await this.memberRepository.findOne({
            where: { companyId, externalId }
        });

        if (!member) {
            member = this.memberRepository.create({
                companyId,
                externalId,
                username: username || `player_${externalId.slice(-4)}`,
                isAnonymous: false,
            });
            await this.memberRepository.save(member);
        } else if (username && member.username !== username) {
            member.username = username;
            await this.memberRepository.save(member);
        }

        return member;
    }

    async createAnonymousMember(companyId: string): Promise<Member> {
        const member = this.memberRepository.create({
            companyId,
            username: 'Guest',
            isAnonymous: true,
        });
        return this.memberRepository.save(member);
    }

    async findById(id: string): Promise<Member> {
        const member = await this.memberRepository.findOne({ where: { id }, relations: ['company'] });
        if (!member) {
            throw new NotFoundException(`Member with ID ${id} not found`);
        }
        return member;
    }

    async updatePoints(id: string, points: number): Promise<Member> {
        const member = await this.findById(id);
        member.pointsBalance += points;
        return this.memberRepository.save(member);
    }

    async linkExternalAccount(anonymousId: string, externalId: string, username?: string): Promise<Member> {
        const member = await this.findById(anonymousId);
        if (!member.isAnonymous) {
            throw new Error('Member is already linked to an account');
        }

        // Check if this external ID is already used in this company
        const existing = await this.memberRepository.findOne({ where: { companyId: member.companyId, externalId } });
        if (existing) {
            // MERGE logic: Transfer points from guest to existing account
            existing.pointsBalance += member.pointsBalance;
            await this.memberRepository.save(existing);
            await this.memberRepository.remove(member);
            return existing;
        }

        member.externalId = externalId;
        member.isAnonymous = false;
        if (username) member.username = username;
        return this.memberRepository.save(member);
    }

    async findAll(): Promise<Member[]> {
        return this.memberRepository.find({
            relations: ['company']
        });
    }

    async findAllByCompany(companyId: string): Promise<Member[]> {
        return this.memberRepository.find({
            where: { companyId },
            relations: ['company'],
            order: { pointsBalance: 'DESC' }
        });
    }
}
