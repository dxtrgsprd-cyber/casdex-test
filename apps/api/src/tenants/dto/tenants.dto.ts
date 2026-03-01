import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, IsIn } from 'class-validator';
import { APP_MODULES } from '@casdex/shared';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @IsIn([...APP_MODULES], { each: true })
  enabledModules?: string[];
}
