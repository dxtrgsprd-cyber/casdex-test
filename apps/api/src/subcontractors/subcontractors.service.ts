import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    // Status filter at DB level
    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    const data = await this.prisma.subcontractor.findMany({
      where: where as never,
      orderBy: { companyName: 'asc' },
    });

    // Filter by trade/territory in JS since they're JSON arrays
    let filtered = data;
    if (query.trade) {
      filtered = filtered.filter((s) => {
        const trades = Array.isArray(s.trades) ? (s.trades as string[]) : [];
        return trades.some(
          (t) => t.toLowerCase() === query.trade!.toLowerCase(),
        );
      });
    }
    if (query.territory) {
      filtered = filtered.filter((s) => {
        const territories = Array.isArray(s.territories) ? (s.territories as string[]) : [];
        return territories.some(
          (t) => t.toLowerCase() === query.territory!.toLowerCase(),
        );
      });
    }

    // Search across company name and contacts JSON in JS
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter((s) => {
        if (s.companyName.toLowerCase().includes(searchLower)) return true;
        const contacts = Array.isArray(s.contacts) ? (s.contacts as Array<{ name?: string; email?: string }>) : [];
        return contacts.some(
          (c) =>
            (c.name && c.name.toLowerCase().includes(searchLower)) ||
            (c.email && c.email.toLowerCase().includes(searchLower)),
        );
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
        contacts: dto.contacts || [],
        trades: dto.trades || [],
        territories: dto.territories || [],
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        licenseNumber: dto.licenseNumber,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateSubcontractorDto) {
    const sub = await this.prisma.subcontractor.findFirst({
      where: { id, tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subcontractor not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.contacts !== undefined) updateData.contacts = dto.contacts;
    if (dto.trades !== undefined) updateData.trades = dto.trades;
    if (dto.territories !== undefined) updateData.territories = dto.territories;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.insuranceExpiry !== undefined) {
      updateData.insuranceExpiry = dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null;
    }
    if (dto.licenseNumber !== undefined) updateData.licenseNumber = dto.licenseNumber;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.subcontractor.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, tenantId: string) {
    const sub = await this.prisma.subcontractor.findFirst({
      where: { id, tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subcontractor not found');
    }

    await this.prisma.subcontractor.delete({ where: { id } });
    return { success: true, message: 'Subcontractor deleted' };
  }
}
