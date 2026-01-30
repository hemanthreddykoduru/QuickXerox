import React, { useCallback } from 'react';
import { Upload, File as FileIcon, Plus } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors"
    >
      <div className="flex flex-col items-center">
        <Upload className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm font-medium text-gray-900 mb-2">
          Drag and drop your files here, or
        </p>
        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Files</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileInput}
            multiple
          />
        </label>
        <p className="mt-2 text-xs text-gray-500">
          PDF or Images up to 50MB each
        </p>
      </div>
    </div>
  );
};

export default FileUpload;