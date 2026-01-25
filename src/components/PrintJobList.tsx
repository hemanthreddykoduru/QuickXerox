import React from 'react';
import { File as FileIcon, X } from 'lucide-react';
import { PrintJob } from '../types';

interface PrintJobListProps {
  jobs: PrintJob[];
  onUpdateJob: (job: PrintJob) => void;
  onRemoveJob: (id: string) => void;
}

const PrintJobList: React.FC<PrintJobListProps> = ({ jobs, onUpdateJob, onRemoveJob }) => {
  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <FileIcon className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <p className="font-medium text-gray-900">{job.file.name}</p>
                <p className="text-sm text-gray-500">
                  {(job.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => onRemoveJob(job.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copies
              </label>
              <input
                type="number"
                min="1"
                value={job.copies}
                onChange={(e) => onUpdateJob({
                  ...job,
                  copies: parseInt(e.target.value) || 1
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Print Type
              </label>
              <select
                value={job.isColor ? 'color' : 'bw'}
                onChange={(e) => onUpdateJob({
                  ...job,
                  isColor: e.target.value === 'color'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintJobList;