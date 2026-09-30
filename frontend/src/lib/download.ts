import type { AxiosResponse } from 'axios';

/**
 * Saves a `responseType: 'blob'` response to disk, using the file name from the
 * Content-Disposition header (RFC 5987 `filename*=UTF-8''…`, exposed via CORS).
 */
export function saveBlobResponse(res: AxiosResponse<Blob>, fallbackName = 'documento') {
  const cd = String(res.headers['content-disposition'] ?? '');
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  const name = m ? decodeURIComponent(m[1]) : fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
