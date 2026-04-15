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

  return (
    <motion.div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      initial={false}
      animate={{ 
        borderColor: isDragging ? '#3b82f6' : '#E5E7EB',
        backgroundColor: isDragging ? '#F1F7FF' : '#FFFFFF',
        scale: isDragging ? 1.01 : 1
      }}
      className="relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 group"
    >
      <div className="flex flex-col items-center">
        <div className="relative mb-6">
          <motion.div 
            animate={isDragging ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
            className={`p-4 rounded-2xl transition-all duration-500 ${
              isDragging 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
            }`}
          >
            <Upload className="h-10 w-10 sm:h-12 sm:w-12" />
          </motion.div>
          
          <AnimatePresence>
            {isDragging && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg"
              >
                <CheckCircle2 className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {isDragging ? 'Drop your files now' : 'Upload your documents'}
        </h3>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
          Drag and drop your files here, or click to browse from your device
        </p>

        <label className="relative inline-flex items-center px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer active:scale-95 overflow-hidden group/btn">
          <Plus className="h-4 w-4 mr-2" />
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

        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5 hover:text-gray-600 transition-colors">
            <FileText className="h-4 w-4" />
            PDF, DOCX & Images
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center gap-1.5 hover:text-gray-600 transition-colors">
            <CheckCircle2 className="h-4 w-4" />
            MAX 50MB
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FileUpload;