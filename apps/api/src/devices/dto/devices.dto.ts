import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsString()
  @IsNotEmpty()
  partNumber!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  formFactor?: string;

  @IsBoolean()
  @IsOptional()
  indoor?: boolean;

  @IsBoolean()
  @IsOptional()
  outdoor?: boolean;

  @IsBoolean()
  @IsOptional()
  vandal?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  hfov?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxDistance?: number;

  @IsString()
  @IsOptional()
  focalLength?: string;

  @IsString()
  @IsOptional()
  imager?: string;

  @IsOptional()
  specs?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  mountOptions?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  msrp?: number;
}

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  partNumber?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  formFactor?: string;

  @IsBoolean()
  @IsOptional()
  indoor?: boolean;

  @IsBoolean()
  @IsOptional()
  outdoor?: boolean;

  @IsBoolean()
  @IsOptional()
  vandal?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  hfov?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxDistance?: number;

  @IsString()
  @IsOptional()
  focalLength?: string;

  @IsString()
  @IsOptional()
  imager?: string;

  @IsOptional()
  specs?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  mountOptions?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  msrp?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ListDevicesQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  formFactor?: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  indoor?: string; // 'true' | 'false'

  @IsString()
  @IsOptional()
  outdoor?: string; // 'true' | 'false'

  @IsString()
  @IsOptional()
  status?: string; // 'active' | 'inactive'
}
