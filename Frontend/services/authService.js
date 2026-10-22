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

async function request(path, { method = 'GET', body, csrf = false } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (csrf) {
    if (!csrfToken) {
      const csrfResponse = await request('/auth/csrf');
      csrfToken = csrfResponse.csrfToken;
    }

    headers['X-CSRF-Token'] = csrfToken;
  }

  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR');
  }

  if (response.status === 204) return null;

  let payload = {};

  try {
    payload = await response.json();
  } catch {
    // Handle empty or non-JSON responses below.
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

  return payload;
}

export const authService = {
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: payload,
      csrf: true,
    }),

  login: async (payload) => {
    const result = await request('/auth/login', {
      method: 'POST',
      body: payload,
      csrf: true,
    });

    csrfToken = null;
    return result;
  },

  // Google sign-in
  googleLogin: async (payload) => {
    const result = await request('/auth/google', {
      method: 'POST',
      body: payload,
      csrf: true,
    });

    csrfToken = null;
    return result;
  },

  logout: async () => {
    const result = await request('/auth/logout', {
      method: 'POST',
      csrf: true,
    });

    csrfToken = null;
    return result;
  },

  me: async () => (await request('/auth/me')).user,

  updateLanguage: async (preferredLanguage) =>
    (
      await request('/auth/me/preferences', {
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
