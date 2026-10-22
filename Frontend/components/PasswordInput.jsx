import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import FormInput from './FormInput';
import { useLanguage } from '../context/LanguageContext';

export default function PasswordInput({ id, label, error, hint, confirm = false, ...props }) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  const actionLabel = visible ? (confirm ? t('hideConfirmPassword') : t('hidePassword')) : (confirm ? t('showConfirmPassword') : t('showPassword'));
  return <div className="password-wrap">
    <FormInput id={id} label={label} error={error} hint={hint} type={visible ? 'text' : 'password'} {...props} />
    <button className="password-toggle" type="button" onClick={() => setVisible((current) => !current)} aria-label={actionLabel} aria-pressed={visible}>
      {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
    </button>
  </div>;
}
