import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Video, File, Music } from 'lucide-react';
import api from '../api';

export default function FilePreviewModal({ file, onClose, onDownload }) {
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const previewUrl = `${api.defaults.baseURL}/files/${file.id}/preview`;

  useEffect(() => {
    // If it's a text file, fetch its raw content to display
    const isText = file.type.startsWith('text/') || 
                   file.type === 'application/json' || 
                   file.type === 'application/javascript';
                   
    if (isText) {
      setLoading(true);
      setError(false);
      api.get(`/files/${file.id}/preview`, { responseType: 'text' })
        .then(response => {
          setTextContent(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError(true);
          setLoading(false);
        });
    }
  }, [file]);

  const renderContent = () => {
    const type = file.type;

    if (type.startsWith('image/')) {
      return (
        <div className="flex justify-center items-center p-4 max-h-[65vh]">
          <img src={previewUrl} alt={file.name} className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md border border-slate-200" />
        </div>
      );
    }

    if (type === 'application/pdf') {
      return (
        <iframe 
          src={previewUrl} 
          title={file.name} 
          className="w-full h-[65vh] rounded-lg border border-slate-200" 
        />
      );
    }

    if (type.startsWith('video/')) {
      return (
        <div className="flex justify-center items-center bg-slate-950 rounded-lg p-1">
          <video src={previewUrl} controls className="w-full max-h-[65vh] rounded-lg" />
        </div>
      );
    }

    if (type.startsWith('audio/')) {
      return (
        <div className="flex flex-col justify-center items-center p-12 bg-slate-50 rounded-lg border border-slate-200">
          <Music className="w-16 h-16 text-brand mb-4 animate-bounce" />
          <p className="text-sm text-slate-700 mb-6 font-medium">{file.name}</p>
          <audio src={previewUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    if (type.startsWith('text/') || type === 'application/json' || type === 'application/javascript') {
      if (loading) return <div className="text-center py-20 text-slate-500">Loading document preview...</div>;
      if (error) return <div className="text-center py-20 text-red-500">Unable to load document contents.</div>;
      return (
        <pre className="text-left text-xs bg-slate-50 p-6 rounded-lg max-h-[65vh] overflow-auto text-slate-800 font-mono border border-slate-200 leading-relaxed">
          <code>{textContent}</code>
        </pre>
      );
    }

    // Default: Fallback
    return (
      <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-slate-200">
        <File className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h4 className="text-base font-semibold text-slate-800 mb-2">No Preview Available</h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
          Previews are not supported for this file type ({file.type}). You can download it directly.
        </p>
        <button
          onClick={() => onDownload(file)}
          className="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand-600 active:scale-95 transition-all text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-brand/10 rounded-lg text-brand">
              {file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> :
               file.type.startsWith('video/') ? <Video className="w-5 h-5" /> :
               file.type.startsWith('text/') ? <FileText className="w-5 h-5" /> :
               <File className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 truncate max-w-md">{file.name}</h3>
              <p className="text-[10px] text-slate-500 font-mono">{(file.size / 1024).toFixed(1)} KB • {file.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(file)}
              title="Download File"
              className="p-2 text-slate-500 hover:text-slate-850 hover:bg-slate-150 rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close Preview"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 bg-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
