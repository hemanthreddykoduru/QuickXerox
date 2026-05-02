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
    <div className="space-y-3 sm:space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
              <div className="relative mt-1 text-indigo-600 flex-shrink-0">
                <FileIcon className="h-5 w-5 sm:h-6 sm:w-6" />
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
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white"
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
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base truncate pr-2">{job.file.name}</p>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {(job.file.size / 1024 / 1024).toFixed(2)} MB &nbsp;•&nbsp;
                  <span className="text-indigo-600 font-black">{job.pageCount} {job.pageCount === 1 ? 'page' : 'pages'}</span>
                </p>
              </div>
            </div>

            
            <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
              <button
                onClick={() => onPreview(job.file)}
                className="p-1.5 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
                title="Preview file"
                aria-label="Preview file"
              >
                <Eye className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => onRemoveJob(job.id)}
                className="p-1.5 sm:p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95"
                aria-label="Remove item"
              >
                <X className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
            </div>

          </div>

          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-1.5">
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
                className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-xs sm:text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-1.5">
                Type
              </label>
              <select
                value={job.isColor ? 'color' : 'bw'}
                onChange={(e) => onUpdateJob({
                  ...job,
                  isColor: e.target.value === 'color'
                })}
                className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-xs sm:text-sm outline-none appearance-none"
              >
                <option value="bw">B&W</option>
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