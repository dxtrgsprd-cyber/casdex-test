import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateDesignDto,
  UpdateDesignDto,
  ListDesignsQueryDto,
  AddPlacedDeviceDto,
  UpdatePlacedDeviceDto,
} from './dto/designs.dto';

@Injectable()
export class DesignsService {
  constructor(private prisma: PrismaService) {}

  // --- Designs ---

  async list(tenantId: string, query: ListDesignsQueryDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.oppId) {
      where.oppId = query.oppId;
    }

    const [data, total] = await Promise.all([
      this.prisma.design.findMany({
        where: where as never,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, oppNumber: true, customerName: true, projectName: true } },
          _count: { select: { placedDevices: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.design.count({ where: where as never }),
    ]);

    return { data, total };
  }

  async get(id: string, tenantId: string) {
    const design = await this.prisma.design.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { id: true, oppNumber: true, customerName: true, projectName: true } },
        placedDevices: {
          orderBy: [{ area: 'asc' }, { floor: 'asc' }, { room: 'asc' }],
        },
      },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Fetch device details for all placed devices
    const deviceIds = [...new Set(design.placedDevices.map((pd) => pd.deviceId))];
    const devices = deviceIds.length > 0
      ? await this.prisma.device.findMany({
          where: { id: { in: deviceIds } },
        })
      : [];

    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    const placedDevicesWithInfo = design.placedDevices.map((pd) => ({
      ...pd,
      device: deviceMap.get(pd.deviceId) || null,
    }));

    return {
      ...design,
      placedDevices: placedDevicesWithInfo,
    };
  }

  async create(tenantId: string, userId: string, dto: CreateDesignDto) {
    // If linking to opportunity, verify it belongs to the tenant
    if (dto.oppId) {
      const opp = await this.prisma.opportunity.findFirst({
        where: { id: dto.oppId, tenantId },
      });
      if (!opp) {
        throw new NotFoundException('Opportunity not found');
      }
    }

    return this.prisma.design.create({
      data: {
        tenantId,
        createdById: userId,
        name: dto.name,
        oppId: dto.oppId || null,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { id: true, oppNumber: true, customerName: true, projectName: true } },
        _count: { select: { placedDevices: true } },
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateDesignDto) {
    const design = await this.prisma.design.findFirst({
      where: { id, tenantId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    if (dto.oppId) {
      const opp = await this.prisma.opportunity.findFirst({
        where: { id: dto.oppId, tenantId },
      });
      if (!opp) {
        throw new NotFoundException('Opportunity not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.oppId !== undefined) updateData.oppId = dto.oppId || null;

    return this.prisma.design.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { id: true, oppNumber: true, customerName: true, projectName: true } },
        _count: { select: { placedDevices: true } },
      },
    });
  }

  async changeStatus(id: string, tenantId: string, status: string) {
    const design = await this.prisma.design.findFirst({
      where: { id, tenantId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Validate transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['in_progress'],
      in_progress: ['completed', 'draft'],
      completed: ['exported', 'in_progress'],
      exported: ['in_progress'],
    };

    const allowed = validTransitions[design.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot change status from "${design.status}" to "${status}". Allowed: ${allowed.join(', ')}`,
      );
    }

    return this.prisma.design.update({
      where: { id },
      data: { status },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { id: true, oppNumber: true, customerName: true, projectName: true } },
        _count: { select: { placedDevices: true } },
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const design = await this.prisma.design.findFirst({
      where: { id, tenantId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    await this.prisma.design.delete({ where: { id } });
    return { success: true, message: 'Design deleted' };
  }

  // --- Placed Devices ---

  async addDevice(designId: string, tenantId: string, dto: AddPlacedDeviceDto) {
    const design = await this.prisma.design.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Verify device exists
    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found in library');
    }

    const placed = await this.prisma.placedDevice.create({
      data: {
        designId,
        deviceId: dto.deviceId,
        area: dto.area,
        floor: dto.floor,
        room: dto.room,
        positionX: dto.positionX,
        positionY: dto.positionY,
        rotation: dto.rotation ?? 0,
        fovAngle: dto.fovAngle ?? device.hfov,
        fovDistance: dto.fovDistance ?? device.maxDistance,
        cameraHeight: dto.cameraHeight,
        tilt: dto.tilt,
        notes: dto.notes,
        installDetails: dto.installDetails,
      },
    });

    return { ...placed, device };
  }

  async updateDevice(
    designId: string,
    placedDeviceId: string,
    tenantId: string,
    dto: UpdatePlacedDeviceDto,
  ) {
    const design = await this.prisma.design.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const existing = await this.prisma.placedDevice.findFirst({
      where: { id: placedDeviceId, designId },
    });

    if (!existing) {
      throw new NotFoundException('Placed device not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.floor !== undefined) updateData.floor = dto.floor;
    if (dto.room !== undefined) updateData.room = dto.room;
    if (dto.positionX !== undefined) updateData.positionX = dto.positionX;
    if (dto.positionY !== undefined) updateData.positionY = dto.positionY;
    if (dto.rotation !== undefined) updateData.rotation = dto.rotation;
    if (dto.fovAngle !== undefined) updateData.fovAngle = dto.fovAngle;
    if (dto.fovDistance !== undefined) updateData.fovDistance = dto.fovDistance;
    if (dto.cameraHeight !== undefined) updateData.cameraHeight = dto.cameraHeight;
    if (dto.tilt !== undefined) updateData.tilt = dto.tilt;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.installDetails !== undefined) updateData.installDetails = dto.installDetails;

    return this.prisma.placedDevice.update({
      where: { id: placedDeviceId },
      data: updateData,
    });
  }

  async removeDevice(designId: string, placedDeviceId: string, tenantId: string) {
    const design = await this.prisma.design.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const existing = await this.prisma.placedDevice.findFirst({
      where: { id: placedDeviceId, designId },
    });

    if (!existing) {
      throw new NotFoundException('Placed device not found');
    }

    await this.prisma.placedDevice.delete({ where: { id: placedDeviceId } });
    return { success: true, message: 'Device removed from design' };
  }

  // --- Hardware Schedule ---

  async getHardwareSchedule(id: string, tenantId: string) {
    const design = await this.prisma.design.findFirst({
      where: { id, tenantId },
      include: {
        placedDevices: true,
        opportunity: { select: { oppNumber: true, customerName: true, projectName: true } },
      },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Get unique device IDs
    const deviceIds = [...new Set(design.placedDevices.map((pd) => pd.deviceId))];
    const devices = deviceIds.length > 0
      ? await this.prisma.device.findMany({ where: { id: { in: deviceIds } } })
      : [];
    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    // Group by device and count quantities
    const deviceCounts = new Map<string, { device: typeof devices[0]; quantity: number; areas: string[] }>();

    for (const pd of design.placedDevices) {
      const device = deviceMap.get(pd.deviceId);
      if (!device) continue;

      const entry = deviceCounts.get(pd.deviceId);
      const areaLabel = [pd.area, pd.floor, pd.room].filter(Boolean).join(' > ') || 'Unassigned';

      if (entry) {
        entry.quantity += 1;
        if (!entry.areas.includes(areaLabel)) {
          entry.areas.push(areaLabel);
        }
      } else {
        deviceCounts.set(pd.deviceId, {
          device,
          quantity: 1,
          areas: [areaLabel],
        });
      }
    }

    const items = Array.from(deviceCounts.values()).sort((a, b) =>
      `${a.device.manufacturer} ${a.device.model}`.localeCompare(`${b.device.manufacturer} ${b.device.model}`),
    );

    return {
      designName: design.name,
      version: design.version,
      opportunity: design.opportunity,
      totalDevices: design.placedDevices.length,
      uniqueDevices: items.length,
      items: items.map((item) => ({
        manufacturer: item.device.manufacturer,
        model: item.device.model,
        partNumber: item.device.partNumber,
        category: item.device.category,
        description: item.device.description,
        quantity: item.quantity,
        areas: item.areas,
      })),
    };
  }

  // --- Statement of Work ---

  async getSOW(id: string, tenantId: string) {
    const design = await this.prisma.design.findFirst({
      where: { id, tenantId },
      include: {
        placedDevices: {
          orderBy: [{ area: 'asc' }, { floor: 'asc' }, { room: 'asc' }],
        },
        opportunity: { select: { oppNumber: true, customerName: true, projectName: true, installAddress: true, installCity: true, installState: true, installZip: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const deviceIds = [...new Set(design.placedDevices.map((pd) => pd.deviceId))];
    const devices = deviceIds.length > 0
      ? await this.prisma.device.findMany({ where: { id: { in: deviceIds } } })
      : [];
    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    // Group placed devices by area > floor > room
    const areaMap = new Map<string, Map<string, Map<string, Array<{
      placedDevice: typeof design.placedDevices[0];
      device: typeof devices[0] | undefined;
    }>>>>();

    for (const pd of design.placedDevices) {
      const areaKey = pd.area || 'Unassigned Area';
      const floorKey = pd.floor || 'Unassigned Floor';
      const roomKey = pd.room || 'Unassigned Room';

      if (!areaMap.has(areaKey)) areaMap.set(areaKey, new Map());
      const floors = areaMap.get(areaKey)!;
      if (!floors.has(floorKey)) floors.set(floorKey, new Map());
      const rooms = floors.get(floorKey)!;
      if (!rooms.has(roomKey)) rooms.set(roomKey, []);
      rooms.get(roomKey)!.push({
        placedDevice: pd,
        device: deviceMap.get(pd.deviceId),
      });
    }

    // Convert to array structure
    const areas = Array.from(areaMap.entries()).map(([areaName, floors]) => ({
      area: areaName,
      floors: Array.from(floors.entries()).map(([floorName, rooms]) => ({
        floor: floorName,
        rooms: Array.from(rooms.entries()).map(([roomName, placements]) => ({
          room: roomName,
          devices: placements.map((p) => ({
            id: p.placedDevice.id,
            manufacturer: p.device?.manufacturer || 'Unknown',
            model: p.device?.model || 'Unknown',
            partNumber: p.device?.partNumber || '',
            category: p.device?.category || '',
            cameraHeight: p.placedDevice.cameraHeight,
            fovAngle: p.placedDevice.fovAngle,
            fovDistance: p.placedDevice.fovDistance,
            tilt: p.placedDevice.tilt,
            notes: p.placedDevice.notes,
            installDetails: p.placedDevice.installDetails,
          })),
        })),
      })),
    }));

    return {
      designName: design.name,
      version: design.version,
      status: design.status,
      createdBy: `${design.createdBy.firstName} ${design.createdBy.lastName}`,
      opportunity: design.opportunity,
      totalDevices: design.placedDevices.length,
      areas,
    };
  }
}
