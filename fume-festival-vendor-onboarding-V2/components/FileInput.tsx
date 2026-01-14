
import React, { useState } from 'react';

interface Props {
  label: string;
  accept?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
}

const FileInput: React.FC<Props> = ({ label, accept, onChange, required = false }) => {
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      onChange(file);
    } else {
      setFileName('');
      onChange(null);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 transition hover:border-orange-300 bg-white">
        <input 
          type="file" 
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="text-center pointer-events-none">
          {fileName ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-600 text-sm font-medium">✓ {fileName}</span>
            </div>
          ) : (
            <>
              <div className="text-gray-400 mb-1">
                <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-sm text-gray-400">Tap to upload file</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileInput;
