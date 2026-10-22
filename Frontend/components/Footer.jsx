import { Sprout } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  return <footer className="site-footer"><div className="footer-brand"><Sprout size={18} aria-hidden="true" /><span>{t('footerText')}</span></div><span>{t('footerCopyright')}</span></footer>;
}
