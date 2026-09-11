// Lightweight API client
async function request(method, url, body, isForm) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (isForm) {
    opts.body = body;
  }
  const res = await fetch('/api' + url, opts);
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) data = await res.json();
  if (res.status === 401) {
    document.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error((data && data.error) || 'Not authenticated');
  }
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData, true),
  raw: (url) => fetch('/api' + url, { credentials: 'same-origin' })
};
