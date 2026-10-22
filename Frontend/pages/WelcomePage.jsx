import { ArrowRight, CloudSun, Leaf, Sprout, Wheat } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

const features = [
  { icon: Leaf, title: 'featureSoilTitle', text: 'featureSoilText', tone: 'mint' },
  { icon: Wheat, title: 'featureCropTitle', text: 'featureCropText', tone: 'gold' },
  { icon: CloudSun, title: 'featureWeatherTitle', text: 'featureWeatherText', tone: 'sky' },
];

export default function WelcomePage() {
  const { t } = useLanguage();
  return <><Navbar /><main>
    <section className="hero-section"><div className="hero-shell">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" />{t('welcomeEyebrow')}</div>
        <h1>{t('welcomeTitle')}</h1><p className="hero-description">{t('welcomeDescription')}</p>
        <div className="hero-actions"><Link className="button" to="/register">{t('createAccount')}<ArrowRight size={18} aria-hidden="true" /></Link><Link className="button button-secondary" to="/login">{t('login')}</Link></div>
        <div className="hero-note"><span className="note-sprout"><Sprout size={17} aria-hidden="true" /></span>{t('welcomeNote')}</div>
      </div>
      <div className="hero-art" role="img" aria-label={t('decorativeFarm')}>
        <div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" />
        <div className="field-lines"><i /><i /><i /><i /></div>
        <div className="farm-badge"><span className="badge-icon"><Sprout size={21} aria-hidden="true" /></span><span><b>{t('brand')}</b><small>{t('tagline')}</small></span></div>
        <div className="floating-leaf leaf-one"><Leaf size={21} /></div><div className="floating-leaf leaf-two"><Leaf size={17} /></div>
      </div>
      <div className="hero-language"><LanguageSelector /></div>
    </div></section>
    <section className="features-section"><div className="section-shell"><div className="section-heading"><span className="section-kicker">{t('brand')}</span><h2>{t('howTitle')}</h2><p>{t('howDescription')}</p></div>
      <div className="feature-grid">{features.map(({ icon: Icon, title, text, tone }) => <article className="feature-card" key={title}><span className={`feature-icon ${tone}`}><Icon size={23} aria-hidden="true" /></span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div>
    </div></section>
  </main><Footer /></>;
}
