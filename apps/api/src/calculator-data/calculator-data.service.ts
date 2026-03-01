import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  CreateMountConfigDto,
  UpdateMountConfigDto,
  ListMountConfigsQueryDto,
} from './dto/mount-config.dto';
import {
  CreateReferenceDataDto,
  UpdateReferenceDataDto,
  ListReferenceDataQueryDto,
} from './dto/reference-data.dto';
import {
  CreateComplianceJurisdictionDto,
  UpdateComplianceJurisdictionDto,
} from './dto/compliance-jurisdiction.dto';

@Injectable()
export class CalculatorDataService {
  constructor(private prisma: PrismaService) {}

  // ==================== MOUNT CONFIGS ====================

  async listMountConfigs(query: ListMountConfigsQueryDto) {
    const where: Record<string, unknown> = { isActive: true };
    if (query.manufacturer) {
      where.manufacturer = { equals: query.manufacturer, mode: 'insensitive' };
    }
    if (query.cameraModel) {
      where.cameraModel = query.cameraModel;
    }
    if (query.locationType) {
      where.locationType = query.locationType;
    }

    const data = await this.prisma.mountConfig.findMany({
      where: where as never,
      orderBy: [{ manufacturer: 'asc' }, { sortOrder: 'asc' }, { locationType: 'asc' }],
    });

    return { data, total: data.length };
  }

  async createMountConfig(dto: CreateMountConfigDto) {
    return this.prisma.mountConfig.create({
      data: {
        manufacturer: dto.manufacturer,
        cameraModel: dto.cameraModel || null,
        locationType: dto.locationType,
        components: (dto.components || []) as Prisma.InputJsonValue,
        colorSuffix: (dto.colorSuffix || {}) as Prisma.InputJsonValue,
        colorPattern: dto.colorPattern || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateMountConfig(id: string, dto: UpdateMountConfigDto) {
    const existing = await this.prisma.mountConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mount config not found');

    const updateData: Record<string, unknown> = {};
    if (dto.manufacturer !== undefined) updateData.manufacturer = dto.manufacturer;
    if (dto.cameraModel !== undefined) updateData.cameraModel = dto.cameraModel;
    if (dto.locationType !== undefined) updateData.locationType = dto.locationType;
    if (dto.components !== undefined) updateData.components = dto.components;
    if (dto.colorSuffix !== undefined) updateData.colorSuffix = dto.colorSuffix;
    if (dto.colorPattern !== undefined) updateData.colorPattern = dto.colorPattern;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.mountConfig.update({ where: { id }, data: updateData });
  }

  async deleteMountConfig(id: string) {
    const existing = await this.prisma.mountConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mount config not found');
    await this.prisma.mountConfig.delete({ where: { id } });
    return { success: true, message: 'Mount config deleted' };
  }

  async bulkImportMountConfigs(items: CreateMountConfigDto[]) {
    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        await this.prisma.mountConfig.upsert({
          where: {
            manufacturer_cameraModel_locationType: {
              manufacturer: item.manufacturer,
              cameraModel: (item.cameraModel || null) as string,
              locationType: item.locationType,
            },
          },
          update: {
            components: (item.components || []) as Prisma.InputJsonValue,
            colorSuffix: (item.colorSuffix || {}) as Prisma.InputJsonValue,
            colorPattern: item.colorPattern || null,
            sortOrder: item.sortOrder ?? 0,
          },
          create: {
            manufacturer: item.manufacturer,
            cameraModel: item.cameraModel || null,
            locationType: item.locationType,
            components: (item.components || []) as Prisma.InputJsonValue,
            colorSuffix: (item.colorSuffix || {}) as Prisma.InputJsonValue,
            colorPattern: item.colorPattern || null,
            sortOrder: item.sortOrder ?? 0,
          },
        });
        imported++;
      } catch (e) {
        errors.push(`Failed to import mount config ${item.manufacturer}/${item.cameraModel || 'generic'}/${item.locationType}: ${(e as Error).message}`);
      }
    }

    return { imported, errors };
  }

  // ==================== REFERENCE DATA ====================

  async listReferenceData(query: ListReferenceDataQueryDto) {
    const where: Record<string, unknown> = { isActive: true };
    if (query.category) {
      where.category = query.category;
    }

    const data = await this.prisma.calcReferenceData.findMany({
      where: where as never,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });

    return { data, total: data.length };
  }

  async listReferenceCategories() {
    const results = await this.prisma.calcReferenceData.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return results.map((r) => r.category);
  }

  async createReferenceData(dto: CreateReferenceDataDto) {
    return this.prisma.calcReferenceData.create({
      data: {
        category: dto.category,
        key: dto.key,
        label: dto.label,
        data: (dto.data || {}) as Prisma.InputJsonValue,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateReferenceData(id: string, dto: UpdateReferenceDataDto) {
    const existing = await this.prisma.calcReferenceData.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reference data not found');

    const updateData: Record<string, unknown> = {};
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.key !== undefined) updateData.key = dto.key;
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.data !== undefined) updateData.data = dto.data;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.calcReferenceData.update({ where: { id }, data: updateData });
  }

  async deleteReferenceData(id: string) {
    const existing = await this.prisma.calcReferenceData.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reference data not found');
    await this.prisma.calcReferenceData.delete({ where: { id } });
    return { success: true, message: 'Reference data deleted' };
  }

  async bulkImportReferenceData(items: CreateReferenceDataDto[]) {
    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        await this.prisma.calcReferenceData.upsert({
          where: {
            category_key: {
              category: item.category,
              key: item.key,
            },
          },
          update: {
            label: item.label,
            data: (item.data || {}) as Prisma.InputJsonValue,
            sortOrder: item.sortOrder ?? 0,
          },
          create: {
            category: item.category,
            key: item.key,
            label: item.label,
            data: (item.data || {}) as Prisma.InputJsonValue,
            sortOrder: item.sortOrder ?? 0,
          },
        });
        imported++;
      } catch (e) {
        errors.push(`Failed to import reference data ${item.category}/${item.key}: ${(e as Error).message}`);
      }
    }

    return { imported, errors };
  }

  // ==================== COMPLIANCE JURISDICTIONS ====================

  async listJurisdictions() {
    const data = await this.prisma.complianceJurisdiction.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { stateLabel: 'asc' }],
    });

    return { data, total: data.length };
  }

  async createJurisdiction(dto: CreateComplianceJurisdictionDto) {
    return this.prisma.complianceJurisdiction.create({
      data: {
        stateLabel: dto.stateLabel,
        code: dto.code,
        authority: dto.authority,
        adoptedCodes: (dto.adoptedCodes || []) as Prisma.InputJsonValue,
        maglockRequiresPirRex: dto.maglockRequiresPirRex ?? true,
        maglockRequiresPneumaticPte: dto.maglockRequiresPneumaticPte ?? false,
        fireRatedFailSafeRequired: dto.fireRatedFailSafeRequired ?? true,
        fireRatedCloserRequired: dto.fireRatedCloserRequired ?? true,
        facpTieInRequired: dto.facpTieInRequired ?? true,
        stairwellReIlluminationRequired: dto.stairwellReIlluminationRequired ?? false,
        panicHardwareOnEgressDoors: dto.panicHardwareOnEgressDoors ?? true,
        additionalNotes: (dto.additionalNotes || []) as Prisma.InputJsonValue,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateJurisdiction(id: string, dto: UpdateComplianceJurisdictionDto) {
    const existing = await this.prisma.complianceJurisdiction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Jurisdiction not found');

    const updateData: Record<string, unknown> = {};
    if (dto.stateLabel !== undefined) updateData.stateLabel = dto.stateLabel;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.authority !== undefined) updateData.authority = dto.authority;
    if (dto.adoptedCodes !== undefined) updateData.adoptedCodes = dto.adoptedCodes;
    if (dto.maglockRequiresPirRex !== undefined) updateData.maglockRequiresPirRex = dto.maglockRequiresPirRex;
    if (dto.maglockRequiresPneumaticPte !== undefined) updateData.maglockRequiresPneumaticPte = dto.maglockRequiresPneumaticPte;
    if (dto.fireRatedFailSafeRequired !== undefined) updateData.fireRatedFailSafeRequired = dto.fireRatedFailSafeRequired;
    if (dto.fireRatedCloserRequired !== undefined) updateData.fireRatedCloserRequired = dto.fireRatedCloserRequired;
    if (dto.facpTieInRequired !== undefined) updateData.facpTieInRequired = dto.facpTieInRequired;
    if (dto.stairwellReIlluminationRequired !== undefined) updateData.stairwellReIlluminationRequired = dto.stairwellReIlluminationRequired;
    if (dto.panicHardwareOnEgressDoors !== undefined) updateData.panicHardwareOnEgressDoors = dto.panicHardwareOnEgressDoors;
    if (dto.additionalNotes !== undefined) updateData.additionalNotes = dto.additionalNotes;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.complianceJurisdiction.update({ where: { id }, data: updateData });
  }

  async deleteJurisdiction(id: string) {
    const existing = await this.prisma.complianceJurisdiction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Jurisdiction not found');
    await this.prisma.complianceJurisdiction.delete({ where: { id } });
    return { success: true, message: 'Jurisdiction deleted' };
  }

  async bulkImportJurisdictions(items: CreateComplianceJurisdictionDto[]) {
    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        await this.prisma.complianceJurisdiction.upsert({
          where: { stateLabel: item.stateLabel },
          update: {
            code: item.code,
            authority: item.authority,
            adoptedCodes: (item.adoptedCodes || []) as Prisma.InputJsonValue,
            maglockRequiresPirRex: item.maglockRequiresPirRex ?? true,
            maglockRequiresPneumaticPte: item.maglockRequiresPneumaticPte ?? false,
            fireRatedFailSafeRequired: item.fireRatedFailSafeRequired ?? true,
            fireRatedCloserRequired: item.fireRatedCloserRequired ?? true,
            facpTieInRequired: item.facpTieInRequired ?? true,
            stairwellReIlluminationRequired: item.stairwellReIlluminationRequired ?? false,
            panicHardwareOnEgressDoors: item.panicHardwareOnEgressDoors ?? true,
            additionalNotes: (item.additionalNotes || []) as Prisma.InputJsonValue,
            sortOrder: item.sortOrder ?? 0,
          },
          create: {
            stateLabel: item.stateLabel,
            code: item.code,
            authority: item.authority,
            adoptedCodes: (item.adoptedCodes || []) as Prisma.InputJsonValue,
            maglockRequiresPirRex: item.maglockRequiresPirRex ?? true,
            maglockRequiresPneumaticPte: item.maglockRequiresPneumaticPte ?? false,
            fireRatedFailSafeRequired: item.fireRatedFailSafeRequired ?? true,
            fireRatedCloserRequired: item.fireRatedCloserRequired ?? true,
            facpTieInRequired: item.facpTieInRequired ?? true,
            stairwellReIlluminationRequired: item.stairwellReIlluminationRequired ?? false,
            panicHardwareOnEgressDoors: item.panicHardwareOnEgressDoors ?? true,
            additionalNotes: (item.additionalNotes || []) as Prisma.InputJsonValue,
            sortOrder: item.sortOrder ?? 0,
          },
        });
        imported++;
      } catch (e) {
        errors.push(`Failed to import jurisdiction ${item.stateLabel}: ${(e as Error).message}`);
      }
    }

    return { imported, errors };
  }

  async exportJurisdictions() {
    return this.prisma.complianceJurisdiction.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { stateLabel: 'asc' }],
    });
  }
}
