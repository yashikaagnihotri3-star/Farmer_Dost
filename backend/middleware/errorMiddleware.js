export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND' } });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'REQUEST_TOO_LARGE' } });
  if (error?.name === 'ValidationError') return res.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
  if (error?.name === 'MongoServerSelectionError' || error?.name === 'MongoNetworkError') {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE' } });
  }
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  const code = status === 500 ? 'INTERNAL_ERROR' : error.message;
  if (status === 500) console.error('Unhandled API error:', error?.name ?? 'Error');
  return res.status(status).json({ error: { code } });
}
