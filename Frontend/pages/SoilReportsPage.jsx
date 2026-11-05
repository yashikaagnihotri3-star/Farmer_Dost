import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpDown, Check, ChevronDown, Clock3, CloudUpload, Eye, FileImage, FileText, Filter, FlaskConical, Leaf, Pencil, Plus, Search, Sprout, Trash2, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { soilApiErrorKey, soilReportService } from '../services/soilReportService';
import '../soil-reports.css';

const blank = { name: '', farmer: '', soilType: '', testDate: '', location: '', ph: '', nitrogen: '', phosphorus: '', potassium: '', organicCarbon: '', moisture: '', conductivity: '' };
const fields = [
  ['soilType', 'soilType', 'text'], ['ph', 'ph', 'number'], ['nitrogen', 'nitrogen', 'number'], ['phosphorus', 'phosphorus', 'number'], ['potassium', 'potassium', 'number'], ['organicCarbon', 'organicCarbon', 'number'], ['moisture', 'moisture', 'number'], ['conductivity', 'conductivity', 'number'], ['testDate', 'testingDate', 'date'], ['location', 'location', 'text'],
];
const numberRules = { ph: [0, 14], nitrogen: [0, 10000], phosphorus: [0, 10000], potassium: [0, 10000], organicCarbon: [0, 100], moisture: [0, 100], conductivity: [0, 100000] };

export default function SoilReportsPage() {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState('');
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [active, setActive] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [toast, setToast] = useState('');

  const notify = (key) => { setToast(t(key)); window.setTimeout(() => setToast(''), 3200); };
  const refresh = async () => {
    setLoading(true);
    try { setReports(await soilReportService.list()); setLoadError(''); }
    catch (error) { setReports([]); setLoadError(soilApiErrorKey(error)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  const openForm = (report = null, origin = 'manual') => { setEditingId(report?.id || ''); setForm(report ? { ...blank, ...report } : { ...blank, name: origin === 'upload' && file ? file.name.replace(/\.[^.]+$/, '') : '' }); setMode(report ? (report.method === 'upload' ? 'review' : 'manual') : origin === 'upload' ? 'review' : origin); };
  const chooseFile = (picked) => {
    const selected = picked?.[0]; if (!selected) return;
    const extension = selected.name.match(/\.(pdf|jpe?g|png)$/i)?.[0]?.toLowerCase();
    const expectedMime = extension === '.pdf' ? 'application/pdf' : ['.jpg', '.jpeg'].includes(extension) ? 'image/jpeg' : extension === '.png' ? 'image/png' : '';
    const validType = Boolean(expectedMime) && (!selected.type || selected.type === expectedMime);
    if (!validType) { notify('soilFileTypeError'); return; }
    if (selected.size > 10 * 1024 * 1024) { notify('soilFileSizeError'); return; }
    setFile(selected); setUploadedFile(null); setPreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : ''); setProgress(0);
  };
  const clearFile = () => { if (preview) URL.revokeObjectURL(preview); setPreview(''); setFile(null); setUploadedFile(null); setProgress(0); if (inputRef.current) inputRef.current.value = ''; };
  const startUpload = async () => {
    if (!file) return;
    setBusy(true); setProgress(0);
    try { const result = await soilReportService.upload(file, setProgress); setUploadedFile(result); setProgress(100); openForm(null, 'upload'); }
    catch (error) { notify(soilApiErrorKey(error)); }
    finally { setBusy(false); }
  };
  const extract = () => notify('soilExtractionUnavailable');
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    const data = { ...form, method: mode === 'review' || (editingId && active?.method === 'upload') ? 'upload' : 'manual', extractionStatus: mode === 'review' ? 'unavailable' : form.extractionStatus || 'not_requested' };
    try {
      if (editingId) await soilReportService.update(editingId, data, uploadedFile?.uploadId);
      else await soilReportService.create(data, uploadedFile?.uploadId);
      await refresh(); setMode(''); setActive(null); clearFile(); notify(editingId ? 'soilUpdated' : 'soilSaved');
    } catch (error) { notify(soilApiErrorKey(error)); }
    finally { setBusy(false); }
  };
  const remove = async (report) => { if (window.confirm(t('soilDeleteConfirm').replace('{name}', report.name))) { try { await soilReportService.remove(report.id); await refresh(); if (active?.id === report.id) setActive(null); notify('soilDeleted'); } catch (error) { notify(soilApiErrorKey(error)); } } };
  const viewFile = async (report) => {
    if (!report?.id || !report.reportFile) return;
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try { const blob = await soilReportService.getFile(report.id); const url = URL.createObjectURL(blob); if (tab) { tab.location.href = url; window.setTimeout(() => URL.revokeObjectURL(url), 60000); } else { const anchor = document.createElement('a'); anchor.href = url; anchor.download = report.reportFile.originalName; anchor.click(); URL.revokeObjectURL(url); } }
    catch (error) { tab?.close(); notify(soilApiErrorKey(error)); }
  };
  const visible = useMemo(() => reports.filter((r) => `${r.name} ${r.farmer} ${r.location} ${r.soilType}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || r.method === filter)).sort((a, b) => sort === 'oldest' ? new Date(a.testDate || a.createdAt) - new Date(b.testDate || b.createdAt) : new Date(b.testDate || b.createdAt) - new Date(a.testDate || a.createdAt)), [reports, query, filter, sort]);
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return <div className="soil-app"><header className="soil-topbar"><Link to="/" className="soil-brand"><span><Sprout size={21}/></span>{t('brand')}<small>{t('soilWorkspace')}</small></Link><div className="soil-top-actions"><Link to="/" className="soil-back"><ArrowLeft size={16}/>{t('navHome')}</Link><LanguageSelector compact /></div></header>
    <main className="soil-main"><div className="soil-heading"><div><div className="soil-eyebrow"><Leaf size={15}/>{t('soilEyebrow')}</div><h1>{t('soilTitle')}</h1><p>{t('soilSubtitle')}</p></div><button className="soil-button soil-primary" onClick={() => { clearFile(); setMode('file'); }}><Upload size={17}/>{t('soilUpload')}</button></div>
      <section className="soil-stats"><article className="soil-stat"><span className="soil-stat-icon green"><FlaskConical/></span><div><small>{t('soilTotal')}</small><strong>{reports.length}</strong><em>{t('soilReportsSaved')}</em></div></article><article className="soil-stat"><span className="soil-stat-icon sage"><Clock3/></span><div><small>{t('soilRecent')}</small><strong>{reports.filter((r) => Date.now() - new Date(r.createdAt).getTime() < 30 * 86400000).length}</strong><em>{t('soilLast30Days')}</em></div></article><button className="soil-quick" onClick={() => openForm()}><span><Plus/></span><b>{t('soilManualEntry')}</b><small>{t('soilManualHint')}</small></button></section>
      <section className="soil-content"><div className="soil-section-title"><div><h2>{t('soilSavedReports')}</h2><p>{t('soilSavedSubtitle')}</p></div><span className="soil-count">{reports.length} {t('soilReports')}</span></div>
        <div className="soil-toolbar"><label className="soil-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('soilSearch')} aria-label={t('soilSearch')}/>{query && <button onClick={() => setQuery('')} aria-label={t('soilClear')}><X size={14}/></button>}</label><label className="soil-select"><Filter size={15}/><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('soilFilter')}><option value="all">{t('soilAllMethods')}</option><option value="manual">{t('soilManual')}</option><option value="upload">{t('soilUpload')}</option></select><ChevronDown size={14}/></label><button className="soil-sort" onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}><ArrowUpDown size={15}/>{sort === 'newest' ? t('soilNewest') : t('soilOldest')}</button></div>
        {loadError && <div className="soil-load-error" role="alert"><b>{t(loadError)}</b>{loadError === 'soilLoginRequired' && <Link className="soil-button soil-primary" to="/login">{t('login')}</Link>}<button onClick={refresh}>{t('soilRetry')}</button></div>}
        {loading ? <div className="soil-empty"><span className="soil-spinner"/><p>{t('soilLoading')}</p></div> : visible.length ? <div className="soil-table-wrap"><table className="soil-table"><thead><tr><th>{t('soilReportName')}</th><th>{t('soilType')}</th><th>{t('soilPh')}</th><th>{t('soilNpk')}</th><th>{t('soilDate')}</th><th>{t('soilMethod')}</th><th>{t('soilActions')}</th></tr></thead><tbody>{visible.map((r) => <tr key={r.id}><td><button className="soil-name-link" onClick={() => setActive(r)}><span className="soil-file-icon">{r.method === 'upload' ? <FileText size={17}/> : <FlaskConical size={17}/>}</span><span><b>{r.name || t('soilUntitled')}</b><small>{r.farmer || t('soilFarmerNotSet')}</small></span></button></td><td>{r.soilType || '—'}</td><td><b>{r.ph || '—'}</b></td><td>{r.nitrogen || '—'} / {r.phosphorus || '—'} / {r.potassium || '—'}</td><td>{r.testDate || '—'}</td><td><span className="soil-method">{r.method === 'upload' ? <Upload size={13}/> : <Pencil size={13}/>} {r.method === 'upload' ? t('soilUploaded') : t('soilManual')}</span></td><td><div className="soil-row-actions"><button title={t('soilView')} aria-label={t('soilView')} onClick={() => setActive(r)}><Eye size={16}/></button><button title={t('soilEdit')} aria-label={t('soilEdit')} onClick={() => openForm(r, r.method || 'manual')}><Pencil size={15}/></button><button title={t('soilDelete')} aria-label={t('soilDelete')} onClick={() => remove(r)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div> : !loadError && <div className="soil-empty"><span><FileImage size={25}/></span><h3>{reports.length ? t('soilNoMatches') : t('soilEmptyTitle')}</h3><p>{reports.length ? t('soilNoMatchesText') : t('soilEmptyText')}</p>{!reports.length && <button className="soil-button soil-primary" onClick={() => { clearFile(); setMode('file'); }}><Upload size={16}/>{t('soilUploadFirst')}</button>}</div>}
      </section><section className="soil-activity"><h2><Clock3 size={18}/>{t('soilActivity')}</h2>{reports.slice(0, 3).length ? reports.slice(0, 3).map((r) => <div className="soil-activity-row" key={r.id}><span><Check size={14}/></span><p><b>{r.name || t('soilUntitled')}</b> {t('soilActivitySaved')} <small>{new Date(r.updatedAt).toLocaleDateString()}</small></p></div>) : <p className="soil-activity-empty">{t('soilNoActivity')}</p>}</section>
    </main>
    {mode === 'file' && <div className="soil-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setMode('')}><section className="soil-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-title"><button className="soil-close" onClick={() => { setMode(''); clearFile(); }} aria-label={t('soilClose')}><X/></button><div className="soil-dialog-icon"><CloudUpload/></div><h2 id="upload-title">{t('soilUploadTitle')}</h2><p>{t('soilUploadDescription')}</p><div className={`soil-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files); }}>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => chooseFile(e.target.files)} hidden />{file ? <div className="soil-file-preview">{preview ? <img src={preview} alt={t('soilImagePreview')}/> : <FileText size={36}/>}<div><b>{file.name}</b><small>{(file.size / 1048576).toFixed(2)} MB</small></div><button onClick={clearFile} aria-label={t('soilRemoveFile')}><X size={17}/></button></div> : <><span className="soil-upload-icon"><CloudUpload size={27}/></span><b>{t('soilDropHere')}</b><small>{t('soilOrBrowse')}</small><button className="soil-button soil-secondary" type="button" onClick={() => inputRef.current?.click()}><FileText size={15}/>{t('soilBrowse')}</button></>}<span className="soil-file-help">{t('soilFileHelp')}</span></div>
        {progress > 0 && <div className="soil-progress"><span style={{ width: `${progress}%` }}/><small>{progress}%</small></div>}{file && <div className="soil-modal-actions"><button className="soil-button soil-secondary" onClick={() => inputRef.current?.click()}>{t('soilReplace')}</button><button className="soil-button soil-primary" onClick={startUpload} disabled={busy}>{busy ? t('soilUploading') : t('soilContinue')}<ArrowUpDown size={15}/></button></div>}</section></div>}
    {mode && mode !== 'file' && <div className="soil-overlay"><section className="soil-dialog soil-form-dialog" role="dialog" aria-modal="true" aria-labelledby="form-title"><button className="soil-close" onClick={() => { setMode(''); clearFile(); }} aria-label={t('soilClose')}><X/></button><div className="soil-dialog-icon"><FlaskConical/></div><h2 id="form-title">{editingId ? t('soilEditTitle') : mode === 'review' ? t('soilReviewTitle') : t('soilManualTitle')}</h2><p>{mode === 'review' ? t('soilReviewDescription') : t('soilManualDescription')}</p>{mode === 'review' && <div className="soil-mock-banner"><FlaskConical size={17}/><span><b>{t('soilExtractionUnavailableLabel')}</b><small>{t('soilExtractionUnavailableDescription')}</small></span><button type="button" onClick={extract}>{t('soilExtractionUnavailableAction')}</button></div>}
        <form onSubmit={save}><div className="soil-form-grid"><label className="soil-field"><span>{t('soilReportName')} *</span><input required value={form.name} onChange={(e) => setValue('name', e.target.value)} placeholder={t('soilReportNamePlaceholder')}/></label><label className="soil-field"><span>{t('soilFarmer')} *</span><input required value={form.farmer} onChange={(e) => setValue('farmer', e.target.value)} placeholder={t('soilFarmerPlaceholder')}/></label>{fields.map(([key, label, type]) => <label className={`soil-field ${key === 'location' ? 'soil-wide' : ''}`} key={key}><span>{t(`soil${label[0].toUpperCase()}${label.slice(1)}`)}{['soilType','testDate','location'].includes(key) ? ' *' : ''}{numberRules[key] && <small> · {key === 'ph' ? t('soilScalePh') : ['nitrogen','phosphorus','potassium'].includes(key) ? t('soilUnitNpk') : key === 'organicCarbon' || key === 'moisture' ? '%' : t('soilUnitEc')}</small>}</span><input type={type} required={['soilType','testDate','location'].includes(key)} min={numberRules[key]?.[0]} max={numberRules[key]?.[1]} step={key === 'ph' ? '0.1' : 'any'} value={form[key] || ''} onChange={(e) => setValue(key, e.target.value)} placeholder={type === 'number' ? t('soilEnterValue') : ''}/></label>)}</div><div className="soil-form-footer"><button className="soil-button soil-text-button" type="button" onClick={() => setForm(blank)}>{t('soilReset')}</button><div><button className="soil-button soil-secondary" type="button" onClick={() => { setMode(''); clearFile(); }}>{t('soilCancel')}</button><button className="soil-button soil-primary" type="submit" disabled={busy}><Check size={16}/>{busy ? t('soilSaving') : t('soilSaveReport')}</button></div></div></form></section></div>}
    {active && <div className="soil-overlay" onMouseDown={(e) => e.target === e.currentTarget && setActive(null)}><section className="soil-dialog soil-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="soil-close" onClick={() => setActive(null)} aria-label={t('soilClose')}><X/></button><div className="soil-detail-top"><div className="soil-dialog-icon"><Sprout/></div><span className="soil-verified"><Check size={13}/>{t('soilVerified')}</span></div><h2 id="detail-title">{active.name}</h2><p>{active.farmer} · {active.testDate || '—'} · {active.location || '—'}</p>{active.fileName && <div className="soil-source-file"><FileText size={16}/>{active.fileName}<button className="soil-button soil-secondary" onClick={() => viewFile(active)}><Eye size={14}/>{t('soilViewFile')}</button></div>}<div className="soil-detail-grid">{fields.map(([key, label]) => <div className="soil-detail-cell" key={key}><small>{t(`soil${label[0].toUpperCase()}${label.slice(1)}`)}</small><b>{active[key] || '—'}{key === 'ph' ? '' : key === 'nitrogen' || key === 'phosphorus' || key === 'potassium' ? ` ${t('soilUnitNpk')}` : key === 'organicCarbon' || key === 'moisture' ? ' %' : key === 'conductivity' ? ` ${t('soilUnitEc')}` : ''}</b></div>)}</div><div className="soil-detail-footer"><span>{active.method === 'upload' ? t('soilUploaded') : t('soilManual')}</span><button className="soil-button soil-primary" onClick={() => { const copy = active; setActive(null); openForm(copy, copy.method || 'manual'); }}><Pencil size={15}/>{t('soilEdit')}</button></div></section></div>}
    {toast && <div className="soil-toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}
