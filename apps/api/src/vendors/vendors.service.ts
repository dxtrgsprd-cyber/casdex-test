import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateVendorDto, UpdateVendorDto, ListVendorsQueryDto } from './dto/vendors.dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: ListVendorsQueryDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: where as never,
        orderBy: { name: 'asc' },
      }),
      this.prisma.vendor.count({ where: where as never }),
    ]);

    // Filter by category in JS since categories is a JSON array
    let filtered = data;
    if (query.category) {
      filtered = filtered.filter((v) => {
        const categories = Array.isArray(v.categories) ? (v.categories as string[]) : [];
        return categories.some(
          (c) => c.toLowerCase() === query.category!.toLowerCase(),
        );
      });
    }

    // Also search within contacts JSON
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter((v) => {
        if (v.name.toLowerCase().includes(searchLower)) return true;
        const contacts = Array.isArray(v.contacts) ? (v.contacts as Array<{ name?: string; email?: string }>) : [];
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
        website: dto.website,
        categories: dto.categories || [],
        contacts: dto.contacts || [],
        notes: dto.notes,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.categories !== undefined) updateData.categories = dto.categories;
    if (dto.contacts !== undefined) updateData.contacts = dto.contacts;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.vendor.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, tenantId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    await this.prisma.vendor.delete({ where: { id } });
    return { success: true, message: 'Vendor deleted' };
  }
}
