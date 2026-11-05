const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

let csrfToken = null;

export class ApiError extends Error {
  constructor(code, { status = 0, fields = {} } = {}) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export async function apiRequest(path, { method = 'GET', body, csrf = false, responseType = 'json', onUploadProgress } = {}) {
  const headers = {};

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (csrf) {
    if (!csrfToken) {
      const csrfResponse = await apiRequest('/auth/csrf');
      csrfToken = csrfResponse.csrfToken;
    }

    headers['X-CSRF-Token'] = csrfToken;
  }

  if (onUploadProgress && body instanceof FormData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, `${apiBaseUrl}${path}`);
      xhr.withCredentials = true;
      if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) onUploadProgress(Math.round((event.loaded / event.total) * 100)); };
      xhr.onerror = () => reject(new ApiError('NETWORK_ERROR'));
      xhr.onload = () => {
        if (xhr.status === 204) { resolve(null); return; }
        let payload = {};
        try { payload = JSON.parse(xhr.responseText || '{}'); } catch { /* handled below */ }
        if (xhr.status < 200 || xhr.status >= 300) {
          if (xhr.status === 403 && payload?.error?.code === 'CSRF_INVALID') csrfToken = null;
          reject(new ApiError(payload?.error?.code || (xhr.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'REQUEST_FAILED'), { status: xhr.status, fields: payload?.error?.fields || {} }));
          return;
        }
        resolve(payload);
      };
      xhr.send(body);
    });
  }

  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers,
      ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR');
  }

  if (response.status === 204) return null;

  let payload = {};

  if (!response.ok || responseType !== 'blob') {
    try {
      payload = await response.json();
    } catch {
      // Handle empty or non-JSON responses below.
    }
  }

  if (!response.ok) {
    if (response.status === 403 && payload?.error?.code === 'CSRF_INVALID') {
      csrfToken = null;
    }

    throw new ApiError(
      payload?.error?.code ||
        (response.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'REQUEST_FAILED'),
      {
        status: response.status,
        fields: payload?.error?.fields || {},
      }
    );
  }

  if (responseType === 'blob') return response.blob();
  return payload;
}

export const authService = {
  register: (payload) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
      csrf: true,
    }),

  login: async (payload) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: payload,
      csrf: true,
    });

    csrfToken = null;
    return result;
  },

  // Google sign-in
  googleLogin: async (payload) => {
    const result = await apiRequest('/auth/google', {
      method: 'POST',
      body: payload,
      csrf: true,
    });

    csrfToken = null;
    return result;
  },

  logout: async () => {
    const result = await apiRequest('/auth/logout', {
      method: 'POST',
      csrf: true,
    });

    csrfToken = null;
    return result;
  },

  me: async () => (await apiRequest('/auth/me')).user,

  updateLanguage: async (preferredLanguage) =>
    (
      await apiRequest('/auth/me/preferences', {
        method: 'PATCH',
        body: { preferredLanguage },
        csrf: true,
      })
    ).user,
};

const fieldMessageKeys = {
  fullName: { required: 'required', too_long: 'validationError' },
  email: {
    required: 'required',
    invalid_email: 'invalidEmail',
    too_long: 'invalidEmail',
  },
  mobile: {
    required: 'required',
    invalid_mobile: 'invalidMobile',
  },
  password: {
    required: 'required',
    weak_password: 'weakPassword',
    password_too_long: 'weakPassword',
    too_small: 'weakPassword',
    too_big: 'weakPassword',
  },
  confirmPassword: { required: 'required' },
  identifier: {
    required: 'required',
    invalid_identifier: 'invalidIdentifier',
  },
  preferredLanguage: {
    invalid_value: 'validationError',
    invalid_language: 'validationError',
  },
  acceptTerms: { terms_required: 'acceptTerms' },
};

export function mapApiFieldErrors(fields, t) {
  return Object.fromEntries(
    Object.entries(fields).map(([field, code]) => [
      field,
      t(fieldMessageKeys[field]?.[code] || 'validationError'),
    ])
  );
}

export function mapApiError(error) {
  if (error?.code === 'EMAIL_TAKEN') return 'duplicateEmail';
  if (error?.code === 'MOBILE_TAKEN') return 'duplicateMobile';
  if (error?.code === 'INVALID_CREDENTIALS') return 'invalidCredentials';
  if (error?.code === 'GOOGLE_EMAIL_EXISTS') return 'googleEmailExists';
  if (error?.code === 'GOOGLE_AUTH_FAILED') return 'googleAuthFailed';
  if (error?.code === 'GOOGLE_AUTH_NOT_CONFIGURED') return 'googleAuthUnavailable';
  if (error?.code === 'GOOGLE_ACCOUNT_CONFLICT') return 'googleAccountConflict';
  if (error?.code === 'TERMS_REQUIRED') return 'acceptTerms';
  if (error?.code === 'RATE_LIMITED') return 'rateLimited';
  if (error?.code === 'NETWORK_ERROR') return 'networkError';
  if (error?.status >= 500 || error?.code === 'SERVICE_UNAVAILABLE') {
    return 'serverError';
  }

  return 'validationError';
}
