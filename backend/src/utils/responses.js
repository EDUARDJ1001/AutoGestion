const successResponse = (res, message = 'Operacion realizada correctamente', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    ok: true,
    message,
    data
  });
};

const errorResponse = (res, message = 'Ocurrio un error', error = undefined, statusCode = 500) => {
  const payload = {
    ok: false,
    message
  };

  if (error && process.env.NODE_ENV !== 'production') {
    payload.error = error;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse
};
