import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sprout } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FormInput from '../components/FormInput';
import PasswordInput from '../components/PasswordInput';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { validateRegistration } from '../utils/validation';
import { authService, mapApiError, mapApiFieldErrors } from '../services/authService';

const initial = { fullName: '', email: '', mobile: '', password: '', confirmPassword: '', acceptTerms: false };
export default function RegisterPage() {
  const { language, setLanguage, t } = useLanguage();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (Object.keys(errors).length) setErrors(validateRegistration(values, t));
    // Re-render existing validation feedback in the newly selected language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  const update = (event) => {
    const { name, value, checked, type } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setNotice('');
  };
  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    const nextErrors = validateRegistration(values, t);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setNotice('formError'); return; }
    setLoading(true);
    try {
      await authService.register({ fullName: values.fullName.trim(), email: values.email.trim(), mobile: values.mobile.trim(), password: values.password, preferredLanguage: language, acceptTerms: values.acceptTerms });
      setNotice('registrationSuccess');
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        const apiErrors = mapApiFieldErrors(error.fields, t);
        setErrors((current) => ({ ...current, ...apiErrors }));
        setNotice('formError');
      } else setNotice(mapApiError(error));
    } finally { setLoading(false); }
  };
  return <><Navbar /><main className="auth-main"><div className="auth-shell register-shell"><aside className="auth-aside"><div className="aside-logo"><Sprout size={26} aria-hidden="true" /></div><span className="section-kicker">{t('brand')}</span><h2>{t('welcomeTitle')}</h2><p>{t('welcomeDescription')}</p><div className="aside-language"><LanguageSelector /></div></aside>
    <section className="auth-card"><Link className="back-link" to="/"><ArrowLeft size={16} aria-hidden="true" />{t('navHome')}</Link><h1>{t('registerTitle')}</h1><p className="auth-description">{t('registerDescription')}</p>
      <form onSubmit={submit} noValidate>
        <FormInput id="fullName" name="fullName" autoComplete="name" label={t('fullName')} placeholder={t('fullNamePlaceholder')} value={values.fullName} onChange={update} error={errors.fullName} />
        <div className="form-row"><FormInput id="email" name="email" type="email" autoComplete="email" label={t('email')} placeholder={t('emailPlaceholder')} value={values.email} onChange={update} error={errors.email} />
          <FormInput id="mobile" name="mobile" type="tel" autoComplete="tel-national" inputMode="tel" label={t('mobile')} placeholder={t('mobilePlaceholder')} value={values.mobile} onChange={update} error={errors.mobile} /></div>
        <PasswordInput id="password" name="password" autoComplete="new-password" label={t('password')} placeholder={t('passwordPlaceholder')} value={values.password} onChange={update} error={errors.password} hint={t('passwordHint')} />
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" label={t('confirmPassword')} placeholder={t('confirmPasswordPlaceholder')} value={values.confirmPassword} onChange={update} error={errors.confirmPassword} confirm />
        <div className="form-field"><label htmlFor="preferredLanguage">{t('preferredLanguage')}</label><LanguageSelector value={language} onChange={setLanguage} /></div>
        <div className="terms-field"><label className="checkbox-label"><input type="checkbox" name="acceptTerms" checked={values.acceptTerms} onChange={update} aria-describedby={errors.acceptTerms ? 'terms-error' : undefined} /><span>{t('termsPrefix')} <a href="#terms" onClick={(event) => event.preventDefault()}>{t('termsLink')}</a>{t('termsSuffix') && ` ${t('termsSuffix')}`}</span></label>{errors.acceptTerms && <p id="terms-error" className="field-message field-error" role="alert">{errors.acceptTerms}</p>}</div>
        {notice && <div className={`form-notice ${notice === 'registrationSuccess' ? 'form-notice-success' : 'form-notice-error'}`} role="status">{t(notice)}</div>}
        <button className="button submit-button" type="submit" disabled={loading}>{loading ? t('creatingAccount') : t('createAccountAction')}</button>
      </form><p className="auth-switch">{t('alreadyAccount')} <Link to="/login">{t('navLogin')}</Link></p>
    </section></div></main><Footer /></>;
}
