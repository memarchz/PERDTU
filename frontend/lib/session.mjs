export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/explore';
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return '/explore'; }
  if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return '/explore';
  return value;
}
