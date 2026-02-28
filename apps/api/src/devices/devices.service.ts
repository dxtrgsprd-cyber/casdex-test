import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CreateDeviceDto, UpdateDeviceDto, ListDevicesQueryDto } from './dto/devices.dto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListDevicesQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { model: { contains: query.search, mode: 'insensitive' } },
        { partNumber: { contains: query.search, mode: 'insensitive' } },
        { manufacturer: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.manufacturer) {
      where.manufacturer = { equals: query.manufacturer, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.formFactor) {
      where.formFactor = { equals: query.formFactor, mode: 'insensitive' };
    }

    if (query.resolution) {
      where.resolution = query.resolution;
    }

    if (query.indoor === 'true') {
      where.indoor = true;
    }

    if (query.outdoor === 'true') {
      where.outdoor = true;
    }

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.device.findMany({
        where: where as never,
        orderBy: [{ manufacturer: 'asc' }, { model: 'asc' }],
      }),
      this.prisma.device.count({ where: where as never }),
    ]);

    return { data, total };
  }

  async get(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  async create(dto: CreateDeviceDto) {
    const existing = await this.prisma.device.findUnique({
      where: { partNumber: dto.partNumber },
    });

    if (existing) {
      throw new ConflictException(`Device with part number ${dto.partNumber} already exists`);
    }

    return this.prisma.device.create({
      data: {
        manufacturer: dto.manufacturer,
        category: dto.category,
        model: dto.model,
        partNumber: dto.partNumber,
        description: dto.description,
        resolution: dto.resolution,
        formFactor: dto.formFactor,
        indoor: dto.indoor,
        outdoor: dto.outdoor,
        vandal: dto.vandal,
        hfov: dto.hfov,
        maxDistance: dto.maxDistance,
        focalLength: dto.focalLength,
        imager: dto.imager,
        specs: (dto.specs || {}) as Prisma.InputJsonValue,
        mountOptions: (dto.mountOptions || []) as Prisma.InputJsonValue,
        msrp: dto.msrp,
      },
    });
  }

  async update(id: string, dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (dto.partNumber && dto.partNumber !== device.partNumber) {
      const existing = await this.prisma.device.findUnique({
        where: { partNumber: dto.partNumber },
      });
      if (existing) {
        throw new ConflictException(`Device with part number ${dto.partNumber} already exists`);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.manufacturer !== undefined) updateData.manufacturer = dto.manufacturer;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.model !== undefined) updateData.model = dto.model;
    if (dto.partNumber !== undefined) updateData.partNumber = dto.partNumber;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.resolution !== undefined) updateData.resolution = dto.resolution;
    if (dto.formFactor !== undefined) updateData.formFactor = dto.formFactor;
    if (dto.indoor !== undefined) updateData.indoor = dto.indoor;
    if (dto.outdoor !== undefined) updateData.outdoor = dto.outdoor;
    if (dto.vandal !== undefined) updateData.vandal = dto.vandal;
    if (dto.hfov !== undefined) updateData.hfov = dto.hfov;
    if (dto.maxDistance !== undefined) updateData.maxDistance = dto.maxDistance;
    if (dto.focalLength !== undefined) updateData.focalLength = dto.focalLength;
    if (dto.imager !== undefined) updateData.imager = dto.imager;
    if (dto.specs !== undefined) updateData.specs = dto.specs;
    if (dto.mountOptions !== undefined) updateData.mountOptions = dto.mountOptions;
    if (dto.msrp !== undefined) updateData.msrp = dto.msrp;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.device.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.delete({ where: { id } });
    return { success: true, message: 'Device deleted' };
  }

  async getManufacturers() {
    const results = await this.prisma.device.findMany({
      where: { isActive: true },
      select: { manufacturer: true },
      distinct: ['manufacturer'],
      orderBy: { manufacturer: 'asc' },
    });
    return results.map((r) => r.manufacturer);
  }

  async getCategories() {
    const results = await this.prisma.device.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return results.map((r) => r.category);
  }

  async getMounts(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const mountPartNumbers = Array.isArray(device.mountOptions)
      ? (device.mountOptions as string[])
      : [];

    if (mountPartNumbers.length === 0) {
      return [];
    }

    return this.prisma.device.findMany({
      where: {
        partNumber: { in: mountPartNumbers },
        isActive: true,
      },
      orderBy: { model: 'asc' },
    });
  }
}
