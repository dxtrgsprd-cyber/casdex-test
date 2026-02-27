import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  ListSubcontractorsQueryDto,
} from './dto/subcontractors.dto';

@Injectable()
export class SubcontractorsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: ListSubcontractorsQueryDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.includeInactive !== 'true') {
      where.isActive = true;
    }

    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { primaryContact: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const subs = await this.prisma.subcontractor.findMany({
      where: where as never,
      orderBy: { companyName: 'asc' },
    });

    // Filter by trade/territory in-memory since they are JSON arrays
    let filtered = subs;

    if (query.trade) {
      filtered = filtered.filter((s) => {
        const trades = s.trades as string[];
        return Array.isArray(trades) && trades.includes(query.trade!);
      });
    }

    if (query.territory) {
      filtered = filtered.filter((s) => {
        const territories = s.territories as string[];
        return Array.isArray(territories) && territories.includes(query.territory!);
      });
    }

    return { data: filtered, total: filtered.length };
  }

  async get(id: string, tenantId: string) {
    const sub = await this.prisma.subcontractor.findFirst({
      where: { id, tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subcontractor not found');
    }

    return sub;
  }

  async create(tenantId: string, dto: CreateSubcontractorDto) {
    return this.prisma.subcontractor.create({
      data: {
        tenantId,
        companyName: dto.companyName,
        primaryContact: dto.primaryContact,
        email: dto.email,
        phone: dto.phone,
        trades: dto.trades || [],
        territories: dto.territories || [],
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        licenseNumber: dto.licenseNumber,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateSubcontractorDto) {
    const sub = await this.get(id, tenantId);

    return this.prisma.subcontractor.update({
      where: { id: sub.id },
      data: {
        companyName: dto.companyName,
        primaryContact: dto.primaryContact,
        email: dto.email,
        phone: dto.phone,
        trades: dto.trades,
        territories: dto.territories,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        licenseNumber: dto.licenseNumber,
        notes: dto.notes,
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const sub = await this.get(id, tenantId);

    await this.prisma.subcontractor.update({
      where: { id: sub.id },
      data: { isActive: false },
    });

    return { success: true, message: 'Subcontractor deactivated' };
  }

  async reactivate(id: string, tenantId: string) {
    const sub = await this.prisma.subcontractor.findFirst({
      where: { id, tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subcontractor not found');
    }

    return this.prisma.subcontractor.update({
      where: { id: sub.id },
      data: { isActive: true },
    });
  }
}
