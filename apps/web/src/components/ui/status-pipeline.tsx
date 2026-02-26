'use client';

// Visual pipeline showing the full lifecycle of an opportunity.
// Current status is highlighted; past statuses are filled; future statuses are outlined.

const PIPELINE_STAGES = [
  { key: 'opp_created', label: 'OPP' },
  { key: 'survey_scheduled', label: 'Survey' },
  { key: 'design_in_progress', label: 'Design' },
  { key: 'ready_for_quoting', label: 'Quote' },
  { key: 'customer_review', label: 'Customer' },
  { key: 'awaiting_po', label: 'PO' },
  { key: 'project_active', label: 'Project' },
  { key: 'installation', label: 'Install' },
  { key: 'qc_in_progress', label: 'QC' },
  { key: 'closeout', label: 'Close' },
];

// Map all OPP statuses to which pipeline stage they belong to
const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  lead: -1,
  opp_created: 0,
  survey_scheduled: 1,
  survey_completed: 1,
  design_in_progress: 2,
  design_completed: 2,
  rfp_sent: 2,
  ready_for_quoting: 3,
  quote_pending_approval: 3,
  quote_approved: 3,
  quote_declined: 3,
  customer_review: 4,
  customer_approved: 4,
  customer_declined: 4,
  awaiting_po: 5,
  po_received: 5,
  ready_for_project: 5,
  project_active: 6,
  installation: 7,
  qc_in_progress: 8,
  qc_complete: 8,
  closeout: 9,
  closed_won: 10,
  closed_lost: -2,
};

interface StatusPipelineProps {
  currentStatus: string;
}

export function StatusPipeline({ currentStatus }: StatusPipelineProps) {
  const currentIndex = STATUS_TO_STAGE_INDEX[currentStatus] ?? -1;
  const isClosed = currentStatus === 'closed_won' || currentStatus === 'closed_lost';

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((stage, i) => {
          let stageState: 'completed' | 'current' | 'future';
          if (isClosed && currentStatus === 'closed_won') {
            stageState = 'completed';
          } else if (i < currentIndex) {
            stageState = 'completed';
          } else if (i === currentIndex) {
            stageState = 'current';
          } else {
            stageState = 'future';
          }

          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div
                className={`flex-1 flex flex-col items-center ${
                  stageState === 'completed'
                    ? 'text-primary-600'
                    : stageState === 'current'
                      ? 'text-primary-700'
                      : 'text-gray-300'
                }`}
              >
                {/* Dot */}
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    stageState === 'completed'
                      ? 'bg-primary-600 border-primary-600'
                      : stageState === 'current'
                        ? 'bg-white border-primary-600 ring-4 ring-primary-100'
                        : 'bg-white border-gray-300'
                  }`}
                />
                {/* Label */}
                <span
                  className={`text-[10px] mt-1 font-medium ${
                    stageState === 'current' ? 'text-primary-700' : stageState === 'completed' ? 'text-primary-500' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {/* Connector line */}
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 -mt-3 ${
                    i < currentIndex ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Closed status indicator */}
      {isClosed && (
        <div className={`mt-3 text-center text-sm font-medium ${
          currentStatus === 'closed_won' ? 'text-green-600' : 'text-gray-500'
        }`}>
          {currentStatus === 'closed_won' ? 'Closed Won' : 'Closed Lost'}
        </div>
      )}
    </div>
  );
}
