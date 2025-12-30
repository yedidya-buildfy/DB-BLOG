import * as React from 'react';

import { toast } from 'sonner';
import { z } from 'zod';

export interface UploadedFile {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  appUrl?: string;
}

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: { progress: number }) => void;
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
  onUploadBegin,
  onUploadProgress,
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File): Promise<UploadedFile | undefined> {
    setIsUploading(true);
    setUploadingFile(file);
    setProgress(0);

    onUploadBegin?.(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress since fetch doesn't support upload progress easily
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = Math.min(prev + 10, 90);
          onUploadProgress?.({ progress: newProgress });
          return newProgress;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      const uploadedFileData: UploadedFile = {
        key: data.path,
        name: data.name,
        size: data.size,
        type: data.type,
        url: data.url,
        appUrl: data.url,
      };

      setProgress(100);
      onUploadProgress?.({ progress: 100 });
      setUploadedFile(uploadedFileData);
      onUploadComplete?.(uploadedFileData);

      return uploadedFileData;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      onUploadError?.(error);

      // Fallback: create a local object URL for preview
      // This allows the editor to work even without auth
      const fallbackFile: UploadedFile = {
        key: `local-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      };

      setUploadedFile(fallbackFile);
      return fallbackFile;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}

/**
 * Upload files using the Supabase Storage API
 */
export async function uploadFiles(
  _endpoint: string,
  options: {
    files: File[];
    onUploadProgress?: (args: { progress: number }) => void;
  }
): Promise<UploadedFile[]> {
  const results: UploadedFile[] = [];

  for (let i = 0; i < options.files.length; i++) {
    const file = options.files[i];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      results.push({
        key: data.path,
        name: data.name,
        size: data.size,
        type: data.type,
        url: data.url,
        appUrl: data.url,
      });

      // Report progress
      const progress = ((i + 1) / options.files.length) * 100;
      options.onUploadProgress?.({ progress });
    } catch (error) {
      // Fallback for unauthenticated users
      results.push({
        key: `local-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      });
    }
  }

  return results;
}

export function getErrorMessage(err: unknown) {
  const unknownError = 'Something went wrong, please try again later.';

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message);
    return errors.join('\n');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return unknownError;
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err);
  return toast.error(errorMessage);
}
