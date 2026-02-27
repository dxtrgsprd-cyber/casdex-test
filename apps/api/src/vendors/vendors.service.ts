import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  ListVendorsQueryDto,
} from './dto/vendors.dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: ListVendorsQueryDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.category) {
      where.category = query.category;
    }

    if (query.includeInactive !== 'true') {
      where.isActive = true;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contact: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: where as never,
        orderBy: { name: 'asc' },
      }),
      this.prisma.vendor.count({ where: where as never }),
    ]);

    return { data: vendors, total };
  }

  async get(id: string, tenantId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async create(tenantId: string, dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        tenantId,
        name: dto.name,
        contact: dto.contact,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        category: dto.category,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateVendorDto) {
    const vendor = await this.get(id, tenantId);

    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        name: dto.name,
        contact: dto.contact,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        category: dto.category,
        notes: dto.notes,
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const vendor = await this.get(id, tenantId);

    await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: { isActive: false },
    });

    return { success: true, message: 'Vendor deactivated' };
  }

  async reactivate(id: string, tenantId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: { isActive: true },
    });
  }
}
