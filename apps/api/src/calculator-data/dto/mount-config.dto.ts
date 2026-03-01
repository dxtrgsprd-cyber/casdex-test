import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMountConfigDto {
  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @IsString()
  @IsOptional()
  cameraModel?: string;

  @IsString()
  @IsNotEmpty()
  locationType!: string;

  @IsOptional()
  components?: Array<{ component: string; partBase: string; description: string }>;

  @IsOptional()
  colorSuffix?: Record<string, string>;

  @IsString()
  @IsOptional()
  colorPattern?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateMountConfigDto {
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  cameraModel?: string;

  @IsString()
  @IsOptional()
  locationType?: string;

  @IsOptional()
  components?: Array<{ component: string; partBase: string; description: string }>;

  @IsOptional()
  colorSuffix?: Record<string, string>;

  @IsString()
  @IsOptional()
  colorPattern?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkImportMountConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMountConfigDto)
  items!: CreateMountConfigDto[];
}

export class ListMountConfigsQueryDto {
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  cameraModel?: string;

  @IsString()
  @IsOptional()
  locationType?: string;
}
