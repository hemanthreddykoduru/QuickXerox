import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

interface SimplePreviewModalProps {
  file: File;
  onClose: () => void;
}

const SimplePreviewModal: React.FC<SimplePreviewModalProps> = ({ file, onClose }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!fileUrl) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[60] p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-full md:max-w-2xl w-full max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-4 py-3 sm:p-6 border-b border-gray-100">
          <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate">Preview: {file.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-all"
            aria-label="Close preview"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        <div className="flex-grow overflow-auto p-2 sm:p-4 flex items-center justify-center bg-gray-50 min-h-0">
          {isImage && (
            <img src={fileUrl} alt="File preview" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
          )}
          {isPdf && (
            <iframe src={fileUrl} title="PDF preview" className="w-full h-full border-none rounded-lg min-h-[300px]" />
          )}
          {!isImage && !isPdf && (
            <div className="text-center p-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No preview available for this file type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimplePreviewModal;
