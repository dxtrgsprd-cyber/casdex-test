'use client';

export default function SurveyPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
          <p className="text-sm text-gray-500 mt-1">Your surveys, sorted by upcoming first</p>
        </div>
        <button className="btn-primary">New Survey</button>
      </div>

      <div className="grid gap-4">
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">Upcoming</h3>
          <p className="text-sm text-gray-500">No upcoming surveys.</p>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">Current</h3>
          <p className="text-sm text-gray-500">No current surveys.</p>
        </div>
      </div>
    </div>
  );
}
