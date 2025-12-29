import React, { useState, useCallback } from 'react';
import { FileText, Zap, AlertTriangle, CheckCircle, Info, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DocumentAnalysis {
  fileType: string;
  pageCount: number;
  colorPages: number;
  blackWhitePages: number;
  estimatedCost: number;
  recommendations: string[];
  warnings: string[];
  optimizations: string[];
  qualityScore: number;
}

interface DocumentAnalyzerProps {
  file: File;
  onAnalysisComplete: (analysis: DocumentAnalysis) => void;
  onOptimize?: (optimizedFile: File) => void;
}

const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({
  file,
  onAnalysisComplete,
  onOptimize
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [showOptimizations, setShowOptimizations] = useState(false);

  const analyzeDocument = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      // Simulate AI analysis (in real implementation, this would call an AI service)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockAnalysis: DocumentAnalysis = {
        fileType: file.type,
        pageCount: Math.floor(Math.random() * 20) + 1,
        colorPages: Math.floor(Math.random() * 5),
        blackWhitePages: Math.floor(Math.random() * 15) + 1,
        estimatedCost: Math.floor(Math.random() * 100) + 20,
        recommendations: [
          'Consider using black & white printing for text-heavy pages to save costs',
          'This document has good print quality and should print clearly',
          'Recommended paper size: A4'
        ],
        warnings: [
          'Some images may appear pixelated when printed at current resolution',
          'Document contains small text that may be difficult to read'
        ],
        optimizations: [
          'Reduce image resolution to optimize file size',
          'Convert color images to grayscale for cost savings',
          'Compress document to reduce printing time'
        ],
        qualityScore: Math.floor(Math.random() * 30) + 70 // 70-100
      };

      setAnalysis(mockAnalysis);
      onAnalysisComplete(mockAnalysis);
      toast.success('Document analysis completed!');
    } catch (error) {
      console.error('Document analysis failed:', error);
      toast.error('Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, onAnalysisComplete]);

  const handleOptimize = async () => {
    if (!analysis) return;

    try {
      // Simulate optimization process
      toast.loading('Optimizing document...', { duration: 2000 });

      // In real implementation, this would process the file
      const optimizedFile = new File([file], `optimized_${file.name}`, {
        type: file.type
      });

      onOptimize?.(optimizedFile);
      toast.success('Document optimized successfully!');
    } catch (error) {
      console.error('Document optimization failed:', error);
      toast.error('Failed to optimize document');
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Analysis</h3>
        </div>
        <button
          onClick={analyzeDocument}
          disabled={isAnalyzing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Zap className="h-4 w-4" />
          <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Document'}</span>
        </button>
      </div>

      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing document with AI...</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Analysis Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{analysis.pageCount}</p>
              <p className="text-sm text-gray-600">Total Pages</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{analysis.colorPages}</p>
              <p className="text-sm text-gray-600">Color Pages</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{analysis.blackWhitePages}</p>
              <p className="text-sm text-gray-600">B&W Pages</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">₹{analysis.estimatedCost}</p>
              <p className="text-sm text-gray-600">Est. Cost</p>
            </div>
          </div>

          {/* Quality Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Print Quality Score</h4>
              <span className={`font-semibold ${getQualityColor(analysis.qualityScore)}`}>
                {analysis.qualityScore}/100 - {getQualityLabel(analysis.qualityScore)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-full rounded-full ${analysis.qualityScore >= 90 ? 'bg-green-500' :
                    analysis.qualityScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  } transition-all duration-300`}
                style={{ width: `${analysis.qualityScore}%` }}>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">AI Recommendations</h4>
            <div className="space-y-3">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Warnings</h4>
              <div className="space-y-3">
                {analysis.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimizations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Optimization Options</h4>
              <button
                onClick={() => setShowOptimizations(!showOptimizations)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showOptimizations ? 'Hide' : 'Show'} Options
              </button>
            </div>

            {showOptimizations && (
              <div className="space-y-3">
                {analysis.optimizations.map((opt, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{opt}</p>
                  </div>
                ))}

                <button
                  onClick={handleOptimize}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-sm font-medium">Apply Optimizations</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalyzer;
