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

export class CreateReferenceDataDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateReferenceDataDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkImportReferenceDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceDataDto)
  items!: CreateReferenceDataDto[];
}

export class ListReferenceDataQueryDto {
  @IsString()
  @IsOptional()
  category?: string;
}
