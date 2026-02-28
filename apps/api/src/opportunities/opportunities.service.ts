import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ChangeStatusDto,
  AddTeamMemberDto,
  AssignProjectNumberDto,
  RequestApprovalDto,
  ResolveApprovalDto,
  ListOpportunitiesQueryDto,
} from './dto/opportunities.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';

// Status transitions — which statuses can move to which
const VALID_TRANSITIONS: Record<string, string[]> = {
  lead: ['opp_created', 'closed_lost'],
  opp_created: ['survey_scheduled', 'design_in_progress', 'closed_lost'],
  survey_scheduled: ['survey_completed', 'closed_lost'],
  survey_completed: ['design_in_progress', 'closed_lost'],
  design_in_progress: ['design_completed', 'closed_lost'],
  design_completed: ['rfp_sent', 'ready_for_quoting', 'closed_lost'],
  rfp_sent: ['ready_for_quoting', 'closed_lost'],
  ready_for_quoting: ['quote_pending_approval', 'closed_lost'],
  quote_pending_approval: ['quote_approved', 'quote_declined'],
  quote_approved: ['customer_review', 'closed_lost'],
  quote_declined: ['ready_for_quoting', 'closed_lost'],
  customer_review: ['customer_approved', 'customer_declined'],
  customer_approved: ['awaiting_po', 'closed_lost'],
  customer_declined: ['customer_review', 'design_in_progress', 'closed_lost'],
  awaiting_po: ['po_received', 'closed_lost'],
  po_received: ['ready_for_project'],
  ready_for_project: ['project_active'],
  project_active: ['installation'],
  installation: ['qc_in_progress'],
  qc_in_progress: ['qc_complete'],
  qc_complete: ['closeout'],
  closeout: ['closed_won'],
};

// Statuses that require a reason when declining
const DECLINE_STATUSES = ['quote_declined', 'customer_declined', 'closed_lost'];

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // --- List / Search ---

  async list(tenantId: string, userId: string, roles: string[], query: ListOpportunitiesQueryDto) {
    const where: Record<string, unknown> = { tenantId };

    // Status filter
    if (query.status) {
      where.status = query.status;
    } else if (query.includesClosed !== 'true') {
      // By default exclude closed
      where.status = { notIn: ['closed_won', 'closed_lost'] };
    }

    // Territory filter
    if (query.territory) {
      where.territory = query.territory;
    }

    // Search (customer name, project name, OPP number)
    if (query.search) {
      where.OR = [
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
        { oppNumber: { contains: query.search, mode: 'insensitive' } },
        { projectNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Role-based filtering: sales/presales/PM/field tech see only their assigned opps
    // Managers and admins see all
    if (!roles.includes('admin') && !roles.includes('manager')) {
      if (query.assignedTo === 'me' || !query.assignedTo) {
        // For non-admin roles, default to showing opps they created or are assigned to
        where.OR = [
          { createdById: userId },
          { teamMembers: { some: { userId } } },
        ];
      }
    }

    // Sorting
    let orderBy: Record<string, string> = { createdAt: 'asc' }; // oldest first by default
    if (query.sortBy === 'created_desc') orderBy = { createdAt: 'desc' };
    if (query.sortBy === 'updated_desc') orderBy = { updatedAt: 'desc' };
    if (query.sortBy === 'customer_asc') orderBy = { customerName: 'asc' };

    const [opps, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where: where as never,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          teamMembers: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          _count: { select: { surveys: true, designs: true, documents: true } },
        },
        orderBy: orderBy as never,
      }),
      this.prisma.opportunity.count({ where: where as never }),
    ]);

    return { data: opps, total };
  }

  // --- Get single OPP ---

  async get(id: string, tenantId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, title: true } },
          },
        },
        surveys: {
          select: { id: true, title: true, status: true, scheduledDate: true, completedDate: true },
          orderBy: { createdAt: 'desc' },
        },
        designs: {
          select: { id: true, name: true, version: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          select: { id: true, type: true, fileName: true, version: true, isSigned: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        project: {
          select: { id: true, projectNumber: true, status: true, startDate: true, estimatedEndDate: true },
        },
        riskAssessments: {
          select: {
            id: true, stage: true, overallScore: true, riskLevel: true,
            cctvScore: true, acsScore: true, equipmentScore: true, installScore: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          select: { id: true, fromStatus: true, toStatus: true, changedBy: true, reason: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        approvals: {
          select: { id: true, type: true, status: true, requestedBy: true, approvedBy: true, reason: true, createdAt: true, resolvedAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { surveys: true, designs: true, documents: true } },
      },
    });

    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }

    return opp;
  }

  // --- Create OPP ---

  async create(tenantId: string, userId: string, dto: CreateOpportunityDto) {
    // Use provided OPP number or auto-generate
    const oppNumber = dto.oppNumber?.trim() || await this.generateOppNumber(tenantId);

    const opp = await this.prisma.opportunity.create({
      data: {
        tenantId,
        oppNumber,
        status: 'opp_created',
        customerName: dto.customerName,
        customerContact: dto.customerContact,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        projectName: dto.projectName,
        systemName: dto.systemName,
        installAddress: dto.installAddress,
        installCity: dto.installCity,
        installState: dto.installState,
        installZip: dto.installZip,
        territory: dto.territory || dto.installState,
        projectDescription: dto.projectDescription,
        notes: dto.notes,
        createdById: userId,
        teamMembers: dto.teamMembers
          ? {
              create: dto.teamMembers.map((tm) => ({
                userId: tm.userId,
                role: tm.role,
              })),
            }
          : undefined,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: 'opp_created',
            changedBy: userId,
          },
        },
      },
    });

    return this.get(opp.id, tenantId);
  }

  // --- Update OPP fields ---

  async update(id: string, tenantId: string, userId: string, dto: UpdateOpportunityDto) {
    const opp = await this.findOrFail(id, tenantId);

    await this.prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        oppNumber: dto.oppNumber,
        customerName: dto.customerName,
        customerContact: dto.customerContact,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        projectName: dto.projectName,
        systemName: dto.systemName,
        installAddress: dto.installAddress,
        installCity: dto.installCity,
        installState: dto.installState,
        installZip: dto.installZip,
        territory: dto.territory,
        projectDescription: dto.projectDescription,
        notes: dto.notes,
        poNumber: dto.poNumber,
      },
    });

    return this.get(id, tenantId);
  }

  // --- Change Status ---

  async changeStatus(id: string, tenantId: string, user: RequestUser, dto: ChangeStatusDto) {
    const opp = await this.findOrFail(id, tenantId);

    // Validate transition
    const allowed = VALID_TRANSITIONS[opp.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${opp.status}" to "${dto.status}"`,
      );
    }

    // Decline statuses require a reason
    if (DECLINE_STATUSES.includes(dto.status) && !dto.reason) {
      throw new BadRequestException('A reason is required for this status change');
    }

    // Business rule: "ready_for_quoting" requires BOM and SOW documents
    // (soft check — warn but allow for now)

    // Business rule: "ready_for_project" requires project number assignment
    if (dto.status === 'project_active' && !opp.projectNumber) {
      throw new BadRequestException('A project number must be assigned before activating the project');
    }

    await this.prisma.$transaction([
      this.prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          status: dto.status,
          closedAt: ['closed_won', 'closed_lost'].includes(dto.status) ? new Date() : undefined,
        },
      }),
      this.prisma.oppStatusHistory.create({
        data: {
          oppId: opp.id,
          fromStatus: opp.status,
          toStatus: dto.status,
          changedBy: user.userId,
          reason: dto.reason,
        },
      }),
    ]);

    // Send notifications based on status change
    await this.notifyStatusChange(opp.id, tenantId, opp.status, dto.status, user.userId);

    return this.get(id, tenantId);
  }

  // --- Team Members ---

  async addTeamMember(id: string, tenantId: string, dto: AddTeamMemberDto) {
    const opp = await this.findOrFail(id, tenantId);

    // Check if already on the team with this role
    const existing = await this.prisma.oppTeamMember.findUnique({
      where: { oppId_userId_role: { oppId: opp.id, userId: dto.userId, role: dto.role } },
    });

    if (existing) {
      throw new BadRequestException('User already has this role on this opportunity');
    }

    await this.prisma.oppTeamMember.create({
      data: { oppId: opp.id, userId: dto.userId, role: dto.role },
    });

    return this.get(id, tenantId);
  }

  async removeTeamMember(id: string, tenantId: string, memberId: string) {
    await this.findOrFail(id, tenantId);

    await this.prisma.oppTeamMember.delete({
      where: { id: memberId },
    });

    return this.get(id, tenantId);
  }

  // --- Assign Project Number ---

  async assignProjectNumber(id: string, tenantId: string, userId: string, dto: AssignProjectNumberDto) {
    const opp = await this.findOrFail(id, tenantId);

    if (opp.projectNumber) {
      throw new BadRequestException('This opportunity already has a project number');
    }

    // Validate project number format (PN-XXXXX)
    if (!dto.projectNumber.match(/^PN-\d+$/)) {
      throw new BadRequestException('Project number must be in format PN-XXXXX');
    }

    // Check uniqueness
    const existing = await this.prisma.opportunity.findFirst({
      where: { tenantId, projectNumber: dto.projectNumber },
    });
    if (existing) {
      throw new BadRequestException('This project number is already in use');
    }

    // Update OPP with project number
    await this.prisma.opportunity.update({
      where: { id: opp.id },
      data: { projectNumber: dto.projectNumber },
    });

    // Create the Project record
    await this.prisma.project.create({
      data: {
        tenantId,
        oppId: opp.id,
        projectNumber: dto.projectNumber,
        projectManagerId: dto.projectManagerId,
        status: 'active',
      },
    });

    // Ensure PM is on the team
    const pmOnTeam = await this.prisma.oppTeamMember.findFirst({
      where: { oppId: opp.id, userId: dto.projectManagerId, role: 'project_manager' },
    });
    if (!pmOnTeam) {
      await this.prisma.oppTeamMember.create({
        data: { oppId: opp.id, userId: dto.projectManagerId, role: 'project_manager' },
      });
    }

    // Notify PM
    await this.notifications.create(
      dto.projectManagerId,
      'project_assigned',
      `Project ${dto.projectNumber} Assigned`,
      `You have been assigned as Project Manager for ${opp.oppNumber} - ${opp.projectName}`,
      `/projects/${dto.projectNumber}`,
    );

    return this.get(id, tenantId);
  }

  // --- Approvals ---

  async requestApproval(id: string, tenantId: string, userId: string, dto: RequestApprovalDto) {
    const opp = await this.findOrFail(id, tenantId);

    // Check for pending approval of same type
    const pending = await this.prisma.approval.findFirst({
      where: { oppId: opp.id, type: dto.type, status: 'pending' },
    });
    if (pending) {
      throw new BadRequestException('There is already a pending approval of this type');
    }

    const approval = await this.prisma.approval.create({
      data: {
        oppId: opp.id,
        type: dto.type,
        requestedBy: userId,
        status: 'pending',
        reason: dto.notes,
      },
    });

    // Notify the right people based on approval type
    await this.notifyApprovalRequest(opp, dto.type, userId);

    return approval;
  }

  async resolveApproval(
    oppId: string,
    approvalId: string,
    tenantId: string,
    userId: string,
    dto: ResolveApprovalDto,
  ) {
    await this.findOrFail(oppId, tenantId);

    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, oppId, status: 'pending' },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found or already resolved');
    }

    if (dto.status === 'declined' && !dto.reason) {
      throw new BadRequestException('A reason is required when declining');
    }

    await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: dto.status,
        approvedBy: userId,
        reason: dto.reason,
        resolvedAt: new Date(),
      },
    });

    // Notify the requester
    await this.notifications.create(
      approval.requestedBy,
      'approval_resolved',
      `Approval ${dto.status === 'approved' ? 'Approved' : 'Declined'}`,
      `Your ${approval.type} request has been ${dto.status}${dto.reason ? `: ${dto.reason}` : ''}`,
      `/opportunities/${oppId}`,
    );

    return this.get(oppId, tenantId);
  }

  // --- Delete OPP ---

  async delete(id: string, tenantId: string, userId: string, roles: string[]) {
    const opp = await this.findOrFail(id, tenantId);

    // Business rule: delete requires cross-role approval
    // Sales delete needs presales approval, presales delete needs sales approval
    if (!roles.includes('admin') && !roles.includes('manager')) {
      // Check for an approved delete_approval
      const approved = await this.prisma.approval.findFirst({
        where: { oppId: opp.id, type: 'delete_approval', status: 'approved' },
      });
      if (!approved) {
        throw new ForbiddenException(
          'Deleting an opportunity requires approval. Please request a delete approval first.',
        );
      }
    }

    // Soft delete — mark as closed_lost
    await this.prisma.$transaction([
      this.prisma.opportunity.update({
        where: { id: opp.id },
        data: { status: 'closed_lost', closedAt: new Date() },
      }),
      this.prisma.oppStatusHistory.create({
        data: {
          oppId: opp.id,
          fromStatus: opp.status,
          toStatus: 'closed_lost',
          changedBy: userId,
          reason: 'Deleted',
        },
      }),
    ]);

    return { success: true, message: 'Opportunity closed' };
  }

  // --- Dashboard Metrics ---

  async getMetrics(tenantId: string, userId: string, roles: string[]) {
    const isAdmin = roles.includes('admin') || roles.includes('manager');
    const userFilter = isAdmin ? {} : {
      OR: [
        { createdById: userId },
        { teamMembers: { some: { userId } } },
      ],
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalOpen,
      totalActive,
      closedThisMonth,
      closedThisYear,
      wonThisMonth,
      wonThisYear,
      wonTotal,
      byStatus,
    ] = await Promise.all([
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { notIn: ['closed_won', 'closed_lost'] },
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: 'project_active',
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { in: ['closed_won', 'closed_lost'] },
          closedAt: { gte: startOfMonth },
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { in: ['closed_won', 'closed_lost'] },
          closedAt: { gte: startOfYear },
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: 'closed_won',
          closedAt: { gte: startOfMonth },
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: 'closed_won',
          closedAt: { gte: startOfYear },
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: 'closed_won',
          ...userFilter,
        } as never,
      }),
      this.prisma.opportunity.groupBy({
        by: ['status'],
        where: {
          tenantId,
          status: { notIn: ['closed_won', 'closed_lost'] },
          ...userFilter,
        } as never,
        _count: true,
      }),
    ]);

    return {
      totalOpen,
      totalActive,
      closedThisMonth,
      closedThisYear,
      wonThisMonth,
      wonThisYear,
      wonTotal,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  // --- Private helpers ---

  private async findOrFail(id: string, tenantId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId },
    });
    if (!opp) {
      throw new NotFoundException('Opportunity not found');
    }
    return opp;
  }

  private async generateOppNumber(tenantId: string): Promise<string> {
    // Get the highest OPP number for this tenant
    const latest = await this.prisma.opportunity.findFirst({
      where: { tenantId },
      orderBy: { oppNumber: 'desc' },
      select: { oppNumber: true },
    });

    let nextNum = 1;
    if (latest?.oppNumber) {
      const match = latest.oppNumber.match(/OPP-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `OPP-${String(nextNum).padStart(6, '0')}`;
  }

  private async notifyStatusChange(
    oppId: string,
    tenantId: string,
    fromStatus: string,
    toStatus: string,
    changedById: string,
  ) {
    // Get all team members to notify
    const teamMembers = await this.prisma.oppTeamMember.findMany({
      where: { oppId },
      select: { userId: true, role: true },
    });

    const opp = await this.prisma.opportunity.findUnique({
      where: { id: oppId },
      select: { oppNumber: true, projectName: true, createdById: true },
    });
    if (!opp) return;

    // Include creator
    const userIdsToNotify = new Set<string>();
    teamMembers.forEach((tm) => userIdsToNotify.add(tm.userId));
    userIdsToNotify.add(opp.createdById);
    userIdsToNotify.delete(changedById); // Don't notify the person who made the change

    const statusLabel = toStatus.replace(/_/g, ' ');

    for (const uid of userIdsToNotify) {
      await this.notifications.create(
        uid,
        'opp_status_change',
        `${opp.oppNumber} Status Update`,
        `${opp.oppNumber} - ${opp.projectName} moved to: ${statusLabel}`,
        `/opportunities/${oppId}`,
      );
    }

    // Specific notifications per status
    if (toStatus === 'ready_for_quoting') {
      // Notify ISR and OSR
      const salesMembers = teamMembers.filter((tm) => ['isr', 'osr'].includes(tm.role));
      for (const sm of salesMembers) {
        await this.notifications.create(
          sm.userId,
          'quote_ready',
          `${opp.oppNumber} Ready for Quoting`,
          `BOM, SOW, and Hardware Schedule are ready. Please prepare the official quote.`,
          `/opportunities/${oppId}`,
        );
      }
    }

    if (toStatus === 'quote_pending_approval') {
      // Notify presales
      const presalesMembers = teamMembers.filter(
        (tm) => ['presales_architect', 'presales_engineer'].includes(tm.role),
      );
      for (const pm of presalesMembers) {
        await this.notifications.create(
          pm.userId,
          'approval_request',
          `${opp.oppNumber} Quote Needs Approval`,
          `Sales has marked the quote as ready for approval. Please review.`,
          `/opportunities/${oppId}`,
        );
      }
    }
  }

  private async notifyApprovalRequest(
    opp: { id: string; oppNumber: string; projectName: string },
    type: string,
    requestedById: string,
  ) {
    const teamMembers = await this.prisma.oppTeamMember.findMany({
      where: { oppId: opp.id },
      select: { userId: true, role: true },
    });

    let targetRoles: string[] = [];

    // Business rules: who needs to approve what
    if (type === 'delete_approval') {
      // Determine requester's role
      const requester = teamMembers.find((tm) => tm.userId === requestedById);
      if (requester?.role === 'isr' || requester?.role === 'osr') {
        targetRoles = ['presales_architect', 'presales_engineer'];
      } else {
        targetRoles = ['isr', 'osr'];
      }
    } else if (type === 'quote_approval') {
      targetRoles = ['presales_architect', 'presales_engineer'];
    } else if (type === 'project_approval') {
      // Manager approves project number
      // This goes to managers — but they're not team members, so query by role
      const managers = await this.prisma.userTenant.findMany({
        where: {
          tenantId: (opp as { id: string; oppNumber: string; projectName: string } & Record<string, unknown>)['tenantId'] as string || '',
          role: { name: 'manager' },
          isActive: true,
        },
        select: { userId: true },
      });
      for (const m of managers) {
        await this.notifications.create(
          m.userId,
          'approval_request',
          `${opp.oppNumber} Project Approval Needed`,
          `${opp.oppNumber} - ${opp.projectName} is ready for project number assignment.`,
          `/opportunities/${opp.id}`,
        );
      }
      return;
    }

    const targets = teamMembers.filter((tm) => targetRoles.includes(tm.role));
    for (const t of targets) {
      await this.notifications.create(
        t.userId,
        'approval_request',
        `${opp.oppNumber} Approval Needed`,
        `A ${type.replace(/_/g, ' ')} has been requested for ${opp.oppNumber} - ${opp.projectName}.`,
        `/opportunities/${opp.id}`,
      );
    }
  }
}
