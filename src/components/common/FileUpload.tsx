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
        borderColor: isDragging ? '#3b82f6' : '#e5e7eb',
        backgroundColor: isDragging ? '#eff6ff' : '#ffffff',
        scale: isDragging ? 1.01 : 1
      }}
      className="relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 group"
    >
      <div className="flex flex-col items-center">
        <div className="relative mb-6">
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isDragging ? 'bg-blue-600 text-white scale-110 rotate-3' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:-rotate-3'}`}>
            <Upload className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <AnimatePresence>
            {isDragging && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg"
              >
                <CheckCircle2 className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          {isDragging ? 'Drop to Upload' : 'Upload your documents'}
        </h3>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
          Drag and drop your files here, or click to browse from your device
        </p>

        <label className="relative inline-flex items-center px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer active:scale-95 overflow-hidden group">
          <Plus className="h-4 w-4 mr-2" />
          <span>Select Files</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            multiple
          />
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
        </label>

        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            PDF & DOCX
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            MAX 50MB
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FileUpload;