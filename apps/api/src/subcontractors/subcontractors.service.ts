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

    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { primaryContact: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.subcontractor.findMany({
        where: where as never,
        orderBy: { companyName: 'asc' },
      }),
      this.prisma.subcontractor.count({ where: where as never }),
    ]);

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
    const sub = await this.prisma.subcontractor.findFirst({
      where: { id, tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subcontractor not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.primaryContact !== undefined) updateData.primaryContact = dto.primaryContact;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
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
