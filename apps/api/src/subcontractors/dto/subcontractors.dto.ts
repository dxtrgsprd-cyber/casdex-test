import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreateSubcontractorDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsArray()
  @IsOptional()
  contacts?: Array<{ name: string; email?: string; phone?: string; role?: string }>;

  @IsArray()
  @IsOptional()
  trades?: string[];

  @IsArray()
  @IsOptional()
  territories?: string[];

  @IsDateString()
  @IsOptional()
  insuranceExpiry?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSubcontractorDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsArray()
  @IsOptional()
  contacts?: Array<{ name: string; email?: string; phone?: string; role?: string }>;

  @IsArray()
  @IsOptional()
  trades?: string[];

  @IsArray()
  @IsOptional()
  territories?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  insuranceExpiry?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ListSubcontractorsQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsString()
  @IsOptional()
  territory?: string;

  @IsString()
  @IsOptional()
  status?: string; // 'active' | 'inactive'
}
