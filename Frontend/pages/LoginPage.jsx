
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sprout } from 'lucide-react';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FormInput from '../components/FormInput';
import PasswordInput from '../components/PasswordInput';
import LanguageSelector from '../components/LanguageSelector';

import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../utils/validation';
import { mapApiError, mapApiFieldErrors } from '../services/authService';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function getGoogleErrorMessage(error) {
  switch (error?.code) {
    case 'GOOGLE_EMAIL_EXISTS':
      return 'An account already exists with this email. Please log in using your existing account.';
    case 'GOOGLE_ACCOUNT_CONFLICT':
      return 'This Google account could not be linked. Please try again or use your existing login method.';
    case 'GOOGLE_AUTH_FAILED':
      return 'Google sign-in failed. Please try again.';
    case 'GOOGLE_AUTH_NOT_CONFIGURED':
      return 'Google sign-in is not configured on the server yet.';
    case 'TERMS_REQUIRED':
      return 'Please accept the Terms and Conditions before continuing.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a little and try again.';
    case 'NETWORK_ERROR':
      return 'Could not connect to the server. Check your internet connection.';
    default:
      return error?.status >= 500
        ? 'The server is temporarily unavailable. Please try again later.'
        : 'Google sign-in could not be completed. Please try again.';
  }
}

export default function LoginPage() {
  const { language, t } = useLanguage();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);

  const [acceptGoogleTerms, setAcceptGoogleTerms] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);

  const googleButtonRef = useRef(null);
  const acceptTermsRef = useRef(false);
  const languageRef = useRef(language);
  const loadingRef = useRef(false);

  useEffect(() => {
    acceptTermsRef.current = acceptGoogleTerms;
  }, [acceptGoogleTerms]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (Object.keys(errors).length) {
      setErrors(validateLogin(values, t));
    }

    // Update existing validation messages when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleGoogleCredential = useCallback(
    async (response) => {
      if (loadingRef.current) return;

      if (!acceptTermsRef.current) {
        setGoogleError(
          'Please accept the Terms and Conditions before continuing with Google.'
        );
        return;
      }

      if (!response?.credential) {
        setGoogleError('Google did not return a valid sign-in credential.');
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setGoogleError('');
      setNotice('');

      try {
        await loginWithGoogle({
          credential: response.credential,
          acceptTerms: true,
          preferredLanguage: languageRef.current,
        });

        navigate('/');
      } catch (error) {
        setGoogleError(getGoogleErrorMessage(error));
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate]
  );

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setGoogleError(
        'Google sign-in is not configured. Check VITE_GOOGLE_CLIENT_ID in your frontend .env file.'
      );
      return undefined;
    }

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';

        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 300,
            locale: language,
          }
        );
      }

      setGoogleReady(true);
      setGoogleError('');
    };

    let script = document.querySelector(
      `script[src="${GOOGLE_SCRIPT_URL}"]`
    );

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else if (script) {
      script.addEventListener('load', initializeGoogle);
    } else {
      script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      script.onerror = () => {
        if (!cancelled) {
          setGoogleError(
            'Could not load Google sign-in. Please check your internet connection.'
          );
        }
      };

      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener('load', initializeGoogle);
    };
  }, [language, handleGoogleCredential]);

  const update = (event) => {
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

    setErrors((current) => ({
      ...current,
      [event.target.name]: undefined,
    }));

    setNotice('');
  };

  const submit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const nextErrors = validateLogin(values, t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setNotice('formError');
      return;
    }

    setLoading(true);

    try {
      await login({
        identifier: values.identifier.trim(),
        password: values.password,
      });

      navigate('/');
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        setErrors((current) => ({
          ...current,
          ...mapApiFieldErrors(error.fields, t),
        }));

        setNotice('formError');
      } else {
        setNotice(mapApiError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="auth-main">
        <div className="auth-shell login-shell">
          <aside className="auth-aside">
            <div className="aside-logo">
              <Sprout size={26} aria-hidden="true" />
            </div>

            <span className="section-kicker">{t('brand')}</span>
            <h2>{t('welcomeTitle')}</h2>
            <p>{t('welcomeDescription')}</p>

            <div className="aside-language">
              <LanguageSelector />
            </div>
          </aside>

          <section className="auth-card login-card">
            <Link className="back-link" to="/">
              <ArrowLeft size={16} aria-hidden="true" />
              {t('navHome')}
            </Link>

            <h1>{t('loginTitle')}</h1>
            <p className="auth-description">
              {t('loginDescription')}
            </p>

            {/* Existing email/mobile and password login */}
            <form onSubmit={submit} noValidate>
              <FormInput
                id="identifier"
                name="identifier"
                autoComplete="username"
                label={t('loginIdentifier')}
                placeholder={t('loginIdentifierPlaceholder')}
                value={values.identifier}
                onChange={update}
                error={errors.identifier}
              />

              <PasswordInput
                id="loginPassword"
                name="password"
                autoComplete="current-password"
                label={t('password')}
                placeholder={t('passwordPlaceholder')}
                value={values.password}
                onChange={update}
                error={errors.password}
              />

              <button
                className="forgot-link"
                type="button"
                onClick={() => setForgotNotice(true)}
              >
                {t('forgotPassword')}
              </button>

              {forgotNotice && (
                <div
                  className="form-notice form-notice-error"
                  role="status"
                >
                  {t('forgotUnavailable')}
                </div>
              )}

              {notice && (
                <div
                  className="form-notice form-notice-error"
                  role="status"
                >
                  {t(notice)}
                </div>
              )}

              <button
                className="button submit-button"
                type="submit"
                disabled={loading}
              >
                {loading ? t('loggingIn') : t('loginAction')}
              </button>
            </form>

            {/* Google sign-in */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '24px 0 16px',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              <span
                style={{
                  flex: 1,
                  height: '1px',
                  background: '#e2e8f0',
                }}
              />

              <span>OR CONTINUE WITH</span>

              <span
                style={{
                  flex: 1,
                  height: '1px',
                  background: '#e2e8f0',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '16px',
                minHeight: '40px',
              }}
            >
              <div ref={googleButtonRef} />
            </div>

            {!googleReady && !googleError && (
              <p
                style={{
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                Loading Google sign-in...
              </p>
            )}

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginTop: '12px',
                marginBottom: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={acceptGoogleTerms}
                onChange={(event) => {
                  setAcceptGoogleTerms(event.target.checked);
                  setGoogleError('');
                }}
                style={{
                  marginTop: '3px',
                  flexShrink: 0,
                }}
              />

              <span>
                I agree to the Terms and Conditions for creating or accessing
                my Farmer Dost account using Google.
              </span>
            </label>

            {googleError && (
              <div
                className="form-notice form-notice-error"
                role="alert"
                style={{ marginBottom: '12px' }}
              >
                {googleError}
              </div>
            )}

            <p className="auth-switch">
              {t('noAccount')}{' '}
              <Link to="/register">{t('registerLink')}</Link>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}


