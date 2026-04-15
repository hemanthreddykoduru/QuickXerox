import React, { useCallback, useState } from 'react';
import { Upload, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
    }
  };

  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      initial={false}
      animate={{ 
        borderColor: isDragging ? '#3b82f6' : '#E5E7EB',
        backgroundColor: isDragging ? '#F1F7FF' : '#FFFFFF',
        scale: isDragging ? 1.01 : 1
      }}
      className="relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 group"
    >
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <MotionDiv 
            animate={isDragging ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
            className={`p-3 rounded-xl transition-all duration-500 ${
              isDragging 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
            }`}
          >
            <Upload className="h-8 w-8 text-blue-500" />
          </MotionDiv>
          
          <AnimatePresence>
            {isDragging && (
              <MotionDiv 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-1 -right-1 bg-green-500 text-white p-0.5 rounded-full shadow-lg"
              >
                <CheckCircle2 className="h-4 w-4" />
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>


        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {isDragging ? 'Drop Files' : 'Upload Documents'}
        </h3>
        <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
          {isDragging ? 'Release to upload' : 'Drag & drop or click to browse'}
        </p>

        <label className="relative inline-flex items-center px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer active:scale-95 overflow-hidden group/btn">
          <Plus className="h-3.5 w-3.5 mr-2" />
          <span>Select Files</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            multiple
          />
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500" />
        </label>

        <div className="mt-6 flex items-center justify-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5 transition-colors">
            <FileText className="h-3 w-3" />
            PDF & DOCX
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-200" />
          <div className="flex items-center gap-1.5 transition-colors">
            <CheckCircle2 className="h-3 w-3" />
            MAX 50MB
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FileUpload;