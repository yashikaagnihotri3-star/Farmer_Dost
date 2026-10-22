import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function NotFoundPage() {
  const { t } = useLanguage();
  return <><Navbar /><main className="not-found"><span className="not-found-icon"><Sprout size={32} aria-hidden="true" /></span><h1>{t('notFoundTitle')}</h1><p>{t('notFoundDescription')}</p><Link className="button" to="/">{t('goHome')}</Link></main><Footer /></>;
}
