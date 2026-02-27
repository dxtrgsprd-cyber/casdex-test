import { IsNotEmpty, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';

export class CreateSubcontractorDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @IsOptional()
  primaryContact?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

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

  @IsString()
  @IsOptional()
  primaryContact?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

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

export class ListSubcontractorsQueryDto {
  @IsOptional()
  @IsString()
  trade?: string;

  @IsOptional()
  @IsString()
  territory?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  includeInactive?: string;
}
