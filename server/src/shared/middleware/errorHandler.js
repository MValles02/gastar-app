export function errorHandler(err, req, res, _next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors[0].message });
  }

  console.error(err);

  const status = err.status || err.statusCode || 500;
  const message =
    status >= 500 ? 'Error interno del servidor' : err.message || 'Error interno del servidor';

  res.status(status).json({ error: message });
}
