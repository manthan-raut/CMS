'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({ 
  onUploadSuccess, 
  label = 'Upload File', 
  accept = 'application/pdf,image/jpeg,image/png', 
  maxSizeMB = 5 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = (await apiFetch<any>('/api/upload', {
        method: 'POST',
        body: formData,
      })) as any;
      if (res.success && res.url) {
        setUploadedUrl(res.url);
        onUploadSuccess(res.url);
      } else {
        setError(res.message || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      
      {uploadedUrl ? (
        <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">File uploaded successfully</span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setUploadedUrl(null);
              onUploadSuccess('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-[#F37338] bg-orange-50' : 'border-gray-300 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleChange} 
            accept={accept} 
            className="hidden" 
          />
          <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[#F37338]' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Uploading...' : 'Click or drag file to upload'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max size: {maxSizeMB}MB
          </p>
        </div>
      )}
      
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
