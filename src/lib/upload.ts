/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(file: File): Promise<{
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  return response.json();
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const response = await fetch('/api/upload', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete file');
  }
}

/**
 * Upload multiple files to Supabase Storage
 */
export async function uploadFiles(
  files: File[]
): Promise<
  Array<{
    url: string;
    path: string;
    name: string;
    size: number;
    type: string;
  }>
> {
  return Promise.all(files.map(uploadFile));
}
