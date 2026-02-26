import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Create OPP ---
export class CreateOpportunityDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsOptional()
  customerContact?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  projectName!: string;

  @IsString()
  @IsOptional()
  systemName?: string;

  @IsString()
  @IsOptional()
  installAddress?: string;

  @IsString()
  @IsOptional()
  installCity?: string;

  @IsString()
  @IsOptional()
  installState?: string;

  @IsString()
  @IsOptional()
  installZip?: string;

  @IsString()
  @IsOptional()
  territory?: string;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @IsOptional()
  teamMembers?: TeamMemberDto[];
}

export class TeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  role!: string; // 'isr', 'osr', 'presales_architect', 'presales_engineer', 'project_manager', 'field_tech', 'subcontractor'
}

// --- Update OPP ---
export class UpdateOpportunityDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerContact?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsString()
  @IsOptional()
  systemName?: string;

  @IsString()
  @IsOptional()
  installAddress?: string;

  @IsString()
  @IsOptional()
  installCity?: string;

  @IsString()
  @IsOptional()
  installState?: string;

  @IsString()
  @IsOptional()
  installZip?: string;

  @IsString()
  @IsOptional()
  territory?: string;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  poNumber?: string;
}

// --- Status Change ---
export class ChangeStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsOptional()
  reason?: string; // required for declines
}

// --- Team Member ---
export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;
}

// --- Assign Project Number ---
export class AssignProjectNumberDto {
  @IsString()
  @IsNotEmpty()
  projectNumber!: string;

  @IsString()
  @IsNotEmpty()
  projectManagerId!: string;
}

// --- Request Approval ---
export class RequestApprovalDto {
  @IsString()
  @IsNotEmpty()
  type!: string; // 'quote_approval', 'delete_approval', 'customer_approval', 'project_approval'

  @IsString()
  @IsOptional()
  notes?: string;
}

// --- Resolve Approval ---
export class ResolveApprovalDto {
  @IsString()
  @IsNotEmpty()
  status!: string; // 'approved' or 'declined'

  @IsString()
  @IsOptional()
  reason?: string; // required if declined
}

// --- Query/Filter ---
export class ListOpportunitiesQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  territory?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string; // 'me' or user ID

  @IsOptional()
  @IsString()
  sortBy?: string; // 'created_asc', 'created_desc', 'updated_desc', 'customer_asc'

  @IsOptional()
  @IsString()
  includesClosed?: string; // 'true' to include closed opps
}
