import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  onClose: () => void;
  onConfirm: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose, onConfirm }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Preview Document</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="Close preview"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center items-center h-full">
            <div
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-[800px] h-[600px]"
                  title="Document preview"
                />
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Rotate"
                aria-label="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Download"
                aria-label="Download"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview; 