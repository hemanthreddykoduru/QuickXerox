import { File as FileIcon, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { PrintJob } from '../../types';

interface PrintJobListProps {
  jobs: PrintJob[];
  onUpdateJob: (job: PrintJob) => void;
  onRemoveJob: (id: string) => void;
  onPreview: (file: File) => void;
}

const PrintJobList: React.FC<PrintJobListProps> = ({ jobs, onUpdateJob, onRemoveJob, onPreview }) => {
  const MotionDiv = motion.div as any;

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="relative mt-1">
                <FileIcon className="h-6 w-6 text-blue-600" />
                <MotionDiv
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="absolute -right-1 -bottom-1 bg-green-500 rounded-full p-0.5 shadow-sm border-2 border-white"
                >
                  <motion.svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-2 h-2 text-white"
                  >
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, delay: 0.8 }}
                      d="M20 6L9 17L4 12"
                    />
                  </motion.svg>
                </MotionDiv>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 line-clamp-1">{job.file.name}</p>
                  <MotionDiv
                    initial={{ width: 40, opacity: 0.5 }}
                    animate={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-1 bg-blue-500 rounded-full"
                  />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {(job.file.size / 1024 / 1024).toFixed(2)} MB &nbsp;•&nbsp;
                  <span className="text-blue-600 font-black">{job.pageCount} {job.pageCount === 1 ? 'page' : 'pages'}</span>
                </p>
              </div>
            </div>

            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onPreview(job.file)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-95"
                title="Preview file"
                aria-label="Preview file"
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                onClick={() => onRemoveJob(job.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95"
                aria-label="Remove item"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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