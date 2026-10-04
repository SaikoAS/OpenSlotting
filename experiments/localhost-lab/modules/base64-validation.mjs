// Same accepted syntax as the production grouped regex, without unbounded group recursion.
export function isBase64Linear(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return false;
  let end = value.length;
  if (value.endsWith('==')) end -= 2;
  else if (value.endsWith('=')) end--;
  for (let index = 0; index < end; index++) {
    const code = value.charCodeAt(index);
    if (!(code >= 65 && code <= 90 || code >= 97 && code <= 122 || code >= 48 && code <= 57 || code === 43 || code === 47)) return false;
  }
  return true;
}

export function isBase64Chunked(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return false;
  let end = value.length;
  if (value.endsWith('==')) end -= 2;
  else if (value.endsWith('=')) end--;
  for (let index = 0; index < end; index += 16384) {
    if (/[^A-Za-z0-9+/]/.test(value.slice(index, Math.min(end, index + 16384)))) return false;
  }
  return true;
}
