import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import WelcomePage from './pages/WelcomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return <LanguageProvider><BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<WelcomePage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/login" element={<LoginPage />} /><Route path="*" element={<NotFoundPage />} />
  </Routes></AuthProvider></BrowserRouter></LanguageProvider>;
}
