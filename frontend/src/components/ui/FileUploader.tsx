import React, { useRef, useState } from 'react';
import { FileText, Contact2, UploadCloud, CheckCircle2, X, Plus } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  sublabel?: string;
  accept?: string;
  maxSizeMB?: number;
  type: 'idCard' | 'cv';
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  sublabel = 'Arrastra tu archivo o selecciónalo · Máx. 5 MB',
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSizeMB = 5,
  type,
  selectedFile,
  onFileSelect,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSet(e.target.files[0]);
    }
  };

  const validateAndSet = (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`El archivo supera el tamaño máximo permitido de ${maxSizeMB} MB.`);
      return;
    }
    onFileSelect(file);
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
          selectedFile
            ? 'border-emerald-400 bg-emerald-50/30'
            : isDragging
            ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
        } ${error ? 'border-rose-400 bg-rose-50/30' : ''}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Leading Icon Box */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedFile
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
            }`}
          >
            {type === 'idCard' ? (
              <Contact2 className="w-5 h-5 stroke-[1.8]" />
            ) : (
              <FileText className="w-5 h-5 stroke-[1.8]" />
            )}
          </div>

          {/* Text labels */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {selectedFile ? selectedFile.name : label}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {selectedFile
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Listo para enviar`
                : sublabel}
            </p>
          </div>
        </div>

        {/* Right action indicator */}
        <div className="shrink-0 pl-2">
          {selectedFile ? (
            <button
              type="button"
              onClick={removeFile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Quitar archivo"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:border-emerald-300 group-hover:bg-emerald-50 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-rose-500 font-medium mt-1.5">{error}</p>}
    </div>
  );
};
