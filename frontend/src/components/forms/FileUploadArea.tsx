'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileSelect, isLoading = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateAndSelectFile = (file: File) => {
    setErrorMsg(null);
    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('Arquivo muito grande. Limite máximo é 50MB.');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col gap-2 font-body w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer select-none transition-all duration-200 ${
          isDragActive
            ? 'border-accent bg-cyan-50/30'
            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
          accept=".pdf,.docx,.txt,.csv"
        />

        <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-accent' : 'text-slate-400'}`} />

        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            Arraste um documento ou clique para fazer upload
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Suporta PDF, DOCX, TXT ou CSV até 50MB
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-danger bg-red-50 border border-red-200 rounded p-3 mt-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
