// Shared rules for user-uploaded business documents (quality documents,
// policy attachments). Mime types are client-supplied and not trusted, so the
// whitelist is by extension. No html/svg/js/exe: these files are served back to
// other users.
export const DOC_MAX_BYTES = 25 * 1024 * 1024;

export const DOC_ALLOWED_EXT = [
  'pdf', 'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'csv',
  'ppt', 'pptx', 'odp', 'txt', 'png', 'jpg', 'jpeg', 'vsdx',
];

export function isAllowedDocFile(originalName: string): boolean {
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  return DOC_ALLOWED_EXT.includes(ext);
}

/** "1.0" -> "1.1", "2.3" -> "2.4"; anything unparseable -> "<v>.1" */
export function nextMinorVersion(current: string): string {
  const m = /^(\d+)\.(\d+)$/.exec(current);
  return m ? `${m[1]}.${Number(m[2]) + 1}` : `${current}.1`;
}
