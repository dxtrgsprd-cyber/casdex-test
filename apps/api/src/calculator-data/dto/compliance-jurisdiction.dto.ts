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

export class CreateComplianceJurisdictionDto {
  @IsString()
  @IsNotEmpty()
  stateLabel!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  authority!: string;

  @IsArray()
  @IsOptional()
  adoptedCodes?: string[];

  @IsBoolean()
  @IsOptional()
  maglockRequiresPirRex?: boolean;

  @IsBoolean()
  @IsOptional()
  maglockRequiresPneumaticPte?: boolean;

  @IsBoolean()
  @IsOptional()
  fireRatedFailSafeRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  fireRatedCloserRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  facpTieInRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  stairwellReIlluminationRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  panicHardwareOnEgressDoors?: boolean;

  @IsArray()
  @IsOptional()
  additionalNotes?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateComplianceJurisdictionDto {
  @IsString()
  @IsOptional()
  stateLabel?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  authority?: string;

  @IsArray()
  @IsOptional()
  adoptedCodes?: string[];

  @IsBoolean()
  @IsOptional()
  maglockRequiresPirRex?: boolean;

  @IsBoolean()
  @IsOptional()
  maglockRequiresPneumaticPte?: boolean;

  @IsBoolean()
  @IsOptional()
  fireRatedFailSafeRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  fireRatedCloserRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  facpTieInRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  stairwellReIlluminationRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  panicHardwareOnEgressDoors?: boolean;

  @IsArray()
  @IsOptional()
  additionalNotes?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkImportComplianceJurisdictionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComplianceJurisdictionDto)
  items!: CreateComplianceJurisdictionDto[];
}
