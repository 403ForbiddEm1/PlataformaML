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
        className={`group relative border-2 border-dashed rounded-2xl p-3 sm:p-3.5 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
          selectedFile
            ? 'border-[#C8FF45] bg-[#C8FF45]/10 dark:bg-[#C8FF45]/10'
            : isDragging
            ? 'border-[#4C6FFF] bg-[#4C6FFF]/10 scale-[1.01]'
            : 'border-[#777873]/35 bg-[#F1F2EC]/70 dark:bg-[#090A0C]/70 hover:border-[#4C6FFF] dark:hover:border-[#C8FF45]/60'
        } ${error ? 'border-rose-400 bg-rose-500/10' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Leading Icon Box */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedFile
                ? 'bg-[#C8FF45] text-[#090A0C]'
                : 'bg-[#4C6FFF]/15 text-[#4C6FFF] dark:bg-[#C8FF45]/15 dark:text-[#C8FF45]'
            }`}
          >
            {type === 'idCard' ? (
              <Contact2 className="w-4.5 h-4.5 stroke-[1.8]" />
            ) : (
              <FileText className="w-4.5 h-4.5 stroke-[1.8]" />
            )}
          </div>

          {/* Text labels */}
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-[#090A0C] dark:text-[#F1F2EC] truncate">
              {selectedFile ? selectedFile.name : label}
            </p>
            <p className="text-[11px] text-[#777873] truncate">
              {selectedFile
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Listo para enviar`
                : sublabel}
            </p>
          </div>
        </div>

        {/* Right action indicator */}
        <div className="shrink-0 pl-1">
          {selectedFile ? (
            <button
              type="button"
              onClick={removeFile}
              className="p-1.5 rounded-lg text-[#777873] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Quitar archivo"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#F1F2EC] dark:bg-[#090A0C] border border-[#777873]/30 flex items-center justify-center text-[#4C6FFF] dark:text-[#C8FF45] group-hover:border-[#C8FF45] transition-colors">
              <Plus className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-rose-500 font-medium mt-1.5">{error}</p>}
    </div>
  );
};
