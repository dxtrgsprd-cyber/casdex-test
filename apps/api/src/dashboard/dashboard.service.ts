import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string, userId: string, roles: string[]) {
    const isAdmin = roles.includes('admin') || roles.includes('manager');
    const userFilter = isAdmin
      ? {}
      : {
          OR: [
            { createdById: userId },
            { teamMembers: { some: { userId } } },
          ],
        };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      oppsAssigned,
      surveysScheduled,
      oppsInProgress,
      projectsInProgress,
      oppsCompletedMonth,
      oppsCompletedYear,
      oppsCompletedTotal,
      oppsWonMonth,
      oppsWonYear,
      oppsWonTotal,
      projectsClosedMonth,
      projectsClosedYear,
      projectsClosedTotal,
      unassignedOpps,
      calendarSurveys,
      calendarProjectMilestones,
      vendorCount,
      subcontractorCount,
      recentDocuments,
      riskSummary,
      vendorSummary,
      subcontractorSummary,
    ] = await Promise.all([
      // OPPs assigned to user
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { notIn: ['closed_won', 'closed_lost'] },
          ...userFilter,
        } as never,
      }),

      // Surveys scheduled
      this.prisma.survey.count({
        where: {
          tenantId,
          status: 'scheduled',
          ...(isAdmin ? {} : { assigneeId: userId }),
        } as never,
      }),

      // OPPs in progress (active statuses, not closed, not lead)
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: {
            notIn: ['closed_won', 'closed_lost', 'lead'],
          },
          ...userFilter,
        } as never,
      }),

      // Projects in progress
      this.prisma.project.count({
        where: {
          tenantId,
          status: 'active',
          ...(isAdmin ? {} : { projectManagerId: userId }),
        } as never,
      }),

      // OPPs completed this month (closed_won + closed_lost)
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { in: ['closed_won', 'closed_lost'] },
          closedAt: { gte: startOfMonth },
          ...userFilter,
        } as never,
      }),

      // OPPs completed this year
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { in: ['closed_won', 'closed_lost'] },
          closedAt: { gte: startOfYear },
          ...userFilter,
        } as never,
      }),

      // OPPs completed total
      this.prisma.opportunity.count({
        where: {
          tenantId,
          status: { in: ['closed_won', 'closed_lost'] },
          ...userFilter,
        } as never,
      }),

      // OPPs won this month (has PN)
      this.prisma.opportunity.count({
        where: {
          tenantId,
          projectNumber: { not: null },
          closedAt: { gte: startOfMonth },
          ...userFilter,
        } as never,
      }),

      // OPPs won this year (has PN)
      this.prisma.opportunity.count({
        where: {
          tenantId,
          projectNumber: { not: null },
          closedAt: { gte: startOfYear },
          ...userFilter,
        } as never,
      }),

      // OPPs won total (has PN)
      this.prisma.opportunity.count({
        where: {
          tenantId,
          projectNumber: { not: null },
          ...userFilter,
        } as never,
      }),

      // Projects closed this month
      this.prisma.project.count({
        where: {
          tenantId,
          status: { in: ['completed', 'closed'] },
          actualEndDate: { gte: startOfMonth },
          ...(isAdmin ? {} : { projectManagerId: userId }),
        } as never,
      }),

      // Projects closed this year
      this.prisma.project.count({
        where: {
          tenantId,
          status: { in: ['completed', 'closed'] },
          actualEndDate: { gte: startOfYear },
          ...(isAdmin ? {} : { projectManagerId: userId }),
        } as never,
      }),

      // Projects closed total
      this.prisma.project.count({
        where: {
          tenantId,
          status: { in: ['completed', 'closed'] },
          ...(isAdmin ? {} : { projectManagerId: userId }),
        } as never,
      }),

      // Unassigned OPPs (no PN, oldest first) — bottom list
      this.prisma.opportunity.findMany({
        where: {
          tenantId,
          projectNumber: null,
          status: { notIn: ['closed_won', 'closed_lost'] },
          ...userFilter,
        } as never,
        select: {
          id: true,
          oppNumber: true,
          customerName: true,
          projectName: true,
          status: true,
          territory: true,
          createdAt: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),

      // Calendar: upcoming surveys
      this.prisma.survey.findMany({
        where: {
          tenantId,
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: { gte: new Date() },
          ...(isAdmin ? {} : { assigneeId: userId }),
        } as never,
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          status: true,
          location: true,
          opportunity: { select: { id: true, oppNumber: true, customerName: true } },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 20,
      }),

      // Calendar: project milestones (IKOM, CKOM, estimated end dates)
      this.prisma.project.findMany({
        where: {
          tenantId,
          status: 'active',
          ...(isAdmin ? {} : { projectManagerId: userId }),
        } as never,
        select: {
          id: true,
          projectNumber: true,
          ikomDate: true,
          ckomDate: true,
          startDate: true,
          estimatedEndDate: true,
          opportunity: { select: { customerName: true, projectName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Vendor count
      this.prisma.vendor.count({
        where: { tenantId, isActive: true },
      }),

      // Subcontractor count
      this.prisma.subcontractor.count({
        where: { tenantId, isActive: true },
      }),

      // Recent documents
      this.prisma.document.findMany({
        where: { tenantId },
        select: {
          id: true,
          type: true,
          fileName: true,
          version: true,
          isSigned: true,
          createdAt: true,
          opportunity: { select: { oppNumber: true, customerName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Risk: opps with high/critical risk
      this.prisma.riskAssessment.findMany({
        where: {
          riskLevel: { in: ['high', 'critical', 'elevated'] },
          opportunity: { tenantId, status: { notIn: ['closed_won', 'closed_lost'] } },
        },
        select: {
          id: true,
          overallScore: true,
          riskLevel: true,
          stage: true,
          opportunity: {
            select: { id: true, oppNumber: true, customerName: true, projectName: true },
          },
        },
        orderBy: { overallScore: 'desc' },
        take: 10,
      }),

      // Vendor summary (top 5)
      this.prisma.vendor.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          categories: true,
          contacts: true,
        },
        orderBy: { name: 'asc' },
        take: 5,
      }),

      // Subcontractor summary (top 5)
      this.prisma.subcontractor.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          companyName: true,
          contacts: true,
          trades: true,
          territories: true,
        },
        orderBy: { companyName: 'asc' },
        take: 5,
      }),
    ]);

    // Build calendar events from surveys + project milestones
    const calendarEvents: Array<{
      id: string;
      type: string;
      title: string;
      date: string;
      details: string;
      link: string;
    }> = [];

    for (const s of calendarSurveys) {
      if (s.scheduledDate) {
        calendarEvents.push({
          id: s.id,
          type: 'survey',
          title: s.title,
          date: s.scheduledDate.toISOString(),
          details: s.opportunity
            ? `${s.opportunity.oppNumber} - ${s.opportunity.customerName}`
            : s.location || '',
          link: s.opportunity ? `/opportunities/${s.opportunity.id}` : '',
        });
      }
    }

    for (const p of calendarProjectMilestones) {
      const label = p.opportunity
        ? `${p.projectNumber} - ${p.opportunity.customerName}`
        : p.projectNumber;

      if (p.ikomDate) {
        calendarEvents.push({
          id: `${p.id}-ikom`,
          type: 'ikom',
          title: `IKOM: ${label}`,
          date: p.ikomDate.toISOString(),
          details: p.opportunity?.projectName || '',
          link: `/projects/${p.id}`,
        });
      }
      if (p.ckomDate) {
        calendarEvents.push({
          id: `${p.id}-ckom`,
          type: 'ckom',
          title: `CKOM: ${label}`,
          date: p.ckomDate.toISOString(),
          details: p.opportunity?.projectName || '',
          link: `/projects/${p.id}`,
        });
      }
      if (p.estimatedEndDate) {
        calendarEvents.push({
          id: `${p.id}-end`,
          type: 'due_date',
          title: `Due: ${label}`,
          date: p.estimatedEndDate.toISOString(),
          details: p.opportunity?.projectName || '',
          link: `/projects/${p.id}`,
        });
      }
    }

    calendarEvents.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      metrics: {
        oppsAssigned,
        surveysScheduled,
        oppsInProgress,
        projectsInProgress,
        oppsCompleted: {
          month: oppsCompletedMonth,
          year: oppsCompletedYear,
          total: oppsCompletedTotal,
        },
        oppsWon: {
          month: oppsWonMonth,
          year: oppsWonYear,
          total: oppsWonTotal,
        },
        projectsClosed: {
          month: projectsClosedMonth,
          year: projectsClosedYear,
          total: projectsClosedTotal,
        },
      },
      calendarEvents,
      unassignedOpps,
      vendors: {
        total: vendorCount,
        items: vendorSummary,
      },
      subcontractors: {
        total: subcontractorCount,
        items: subcontractorSummary,
      },
      recentDocuments,
      riskItems: riskSummary,
    };
  }
}
