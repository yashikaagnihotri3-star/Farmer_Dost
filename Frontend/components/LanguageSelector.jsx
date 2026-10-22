import { Globe2 } from 'lucide-react';
import { languageOptions } from '../translations';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function LanguageSelector({ compact = false, value, onChange }) {
  const { language, setLanguage, t } = useLanguage();
  const { user, updateLanguage } = useAuth();
  const [syncError, setSyncError] = useState('');
  const selected = value ?? language;
  const change = onChange ?? setLanguage;
  const handleChange = async (next) => {
    change(next);
    setSyncError('');
    if (user) {
      try { await updateLanguage(next); } catch (error) { setSyncError(error?.status === 401 ? 'sessionExpired' : 'preferenceSaveError'); }
    }
  };
  return <div className="language-picker-wrap"><label className={`language-picker ${compact ? 'language-picker-compact' : ''}`}>
    <Globe2 aria-hidden="true" size={17} />
    <span className="sr-only">{t('languageLabel')}</span>
    <select aria-label={t('languageLabel')} value={selected} onChange={(event) => handleChange(event.target.value)}>
      {languageOptions.map(({ code, labelKey }) => <option key={code} value={code}>{t(labelKey)}</option>)}
    </select>
  </label>{syncError && <span className="language-sync-error" role="status">{t(syncError)}</span>}</div>;
}
