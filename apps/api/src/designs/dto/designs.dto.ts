import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Design DTOs ---

export class CreateDesignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  oppId?: string;
}

export class UpdateDesignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  oppId?: string;
}

export enum DesignStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPORTED = 'exported',
}

export class ChangeDesignStatusDto {
  @IsEnum(DesignStatus)
  status!: DesignStatus;
}

export class ListDesignsQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  oppId?: string;
}

// --- PlacedDevice DTOs ---

export class AddPlacedDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  positionX?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  positionY?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rotation?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fovAngle?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fovDistance?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cameraHeight?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tilt?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  installDetails?: string;
}

export class UpdatePlacedDeviceDto {
  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  positionX?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  positionY?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rotation?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fovAngle?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  fovDistance?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cameraHeight?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tilt?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  installDetails?: string;
}
