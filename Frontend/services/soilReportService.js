import { ApiError, apiRequest } from './authService.js';

function fromApi(report) {
  return {
    id: report.id,
    name: report.reportName,
    farmer: report.farmerName,
    soilType: report.soilType,
    ph: report.soilPH ?? '',
    nitrogen: report.nitrogen ?? '',
    phosphorus: report.phosphorus ?? '',
    potassium: report.potassium ?? '',
    organicCarbon: report.organicCarbon ?? '',
    moisture: report.moisture ?? '',
    conductivity: report.electricalConductivity ?? '',
    testDate: report.testDate ? String(report.testDate).slice(0, 10) : '',
    location: report.location,
    method: report.entryMethod,
    fileName: report.reportFile?.originalName || '',
    reportFile: report.reportFile || null,
    extractionStatus: report.extractionStatus,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function toApi(report, uploadId) {
  return {
    reportName: report.name,
    farmerName: report.farmer,
    soilType: report.soilType,
    soilPH: report.ph === '' ? undefined : report.ph,
    nitrogen: report.nitrogen === '' ? undefined : report.nitrogen,
    phosphorus: report.phosphorus === '' ? undefined : report.phosphorus,
    potassium: report.potassium === '' ? undefined : report.potassium,
    organicCarbon: report.organicCarbon === '' ? undefined : report.organicCarbon,
    moisture: report.moisture === '' ? undefined : report.moisture,
    electricalConductivity: report.conductivity === '' ? undefined : report.conductivity,
    testDate: report.testDate,
    location: report.location,
    extractionStatus: report.extractionStatus || (report.method === 'upload' ? 'unavailable' : 'not_requested'),
    ...(uploadId ? { uploadId } : {}),
  };
}

export const soilReportService = {
  async list() {
    const { reports } = await apiRequest('/soil-reports');
    return reports.map(fromApi);
  },
  async get(id) { return fromApi((await apiRequest(`/soil-reports/${encodeURIComponent(id)}`)).report); },
  async create(report, uploadId) { return fromApi((await apiRequest('/soil-reports', { method: 'POST', body: toApi(report, uploadId), csrf: true })).report); },
  async update(id, report, uploadId) { return fromApi((await apiRequest(`/soil-reports/${encodeURIComponent(id)}`, { method: 'PUT', body: toApi(report, uploadId), csrf: true })).report); },
  remove: (id) => apiRequest(`/soil-reports/${encodeURIComponent(id)}`, { method: 'DELETE', csrf: true }),
  async upload(file, onUploadProgress) {
    const body = new FormData();
    body.append('file', file, file.name);
    return (await apiRequest('/soil-reports/upload', { method: 'POST', body, csrf: true, onUploadProgress })).file;
  },
  getFile: (id) => apiRequest(`/soil-reports/${encodeURIComponent(id)}/file`, { responseType: 'blob' }),
};

export function soilApiErrorKey(error) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.code === 'UNAUTHENTICATED') return 'soilLoginRequired';
    if (error.status === 413 || error.code === 'FILE_TOO_LARGE') return 'soilFileSizeError';
    if (error.status === 415 || error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_FILE_CONTENT') return 'soilFileTypeError';
    if (error.status === 400 || error.status === 422) return 'soilValidationError';
    if (error.status >= 500) return 'soilServerError';
    if (error.code === 'NETWORK_ERROR') return 'soilNetworkError';
  }
  return 'soilServerError';
}
