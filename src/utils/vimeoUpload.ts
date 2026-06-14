// Browser-side resumable upload to Vimeo using tus-js-client.
//
// The backend opens a tus upload ticket (POST /superadmin/api/vimeo/uploads/)
// and returns `upload_link`. We stream the file bytes straight to Vimeo from the
// browser so large videos never transit Django. On success the caller registers
// the finished video via POST /uploads/complete/.
//
// Requires the `tus-js-client` dependency (added to package.json).
import * as tus from 'tus-js-client';

export function uploadFileToVimeo(
  file: File,
  uploadLink: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl: uploadLink,
      endpoint: uploadLink,
      // Vimeo wants the whole file in one stream; Infinity = no client chunking.
      chunkSize: Infinity,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      metadata: { filename: file.name, filetype: file.type },
      onError: (error) => reject(error),
      onProgress: (bytesSent, bytesTotal) => {
        if (bytesTotal > 0) onProgress(Math.round((bytesSent / bytesTotal) * 100));
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}
