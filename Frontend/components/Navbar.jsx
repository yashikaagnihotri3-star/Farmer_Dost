import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useState } from 'react';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try { await logout(); navigate('/'); }
    catch (error) { setLogoutError(error?.code === 'NETWORK_ERROR' ? 'networkError' : 'logoutError'); }
    finally { setLoggingOut(false); }
  };
  return <header className="site-header"><nav className="nav-shell" aria-label={t('navHome')}>
    <Link className="brand" to="/" aria-label={t('brand')}><span className="brand-mark"><Sprout size={23} strokeWidth={2.2} /></span><span>{t('brand')}</span></Link>
    <div className="nav-actions"><LanguageSelector compact />{user ? <><span className="nav-user">{user.fullName}</span><button className="nav-logout" type="button" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? t('loggingOut') : t('logout')}</button></> : <><NavLink className="nav-login" to="/login">{t('navLogin')}</NavLink><Link className="button button-small" to="/register">{t('navCreate')}</Link></>}</div>
    {logoutError && <span className="nav-error" role="status">{t(logoutError)}</span>}
  </nav></header>;
}
