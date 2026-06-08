const notificacionesModel = require('./notificaciones.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const listNotificaciones = async (req, res) => {
  await notificacionesModel.syncOperationalNotifications();

  const [notificaciones, no_leidas] = await Promise.all([
    notificacionesModel.listForUser(req.user, {
      unreadOnly: req.query.no_leidas === 'true',
      limit: Number(req.query.limit || 30)
    }),
    notificacionesModel.countUnreadForUser(req.user)
  ]);

  return successResponse(res, 'Notificaciones obtenidas correctamente', {
    notificaciones,
    no_leidas
  });
};

const getResumen = async (req, res) => {
  await notificacionesModel.syncOperationalNotifications();

  const no_leidas = await notificacionesModel.countUnreadForUser(req.user);

  return successResponse(res, 'Resumen de notificaciones obtenido correctamente', {
    no_leidas
  });
};

const marcarLeida = async (req, res) => {
  const updated = await notificacionesModel.markAsRead(req.user, Number(req.params.id));

  if (!updated) {
    return errorResponse(res, 'Notificacion no encontrada', undefined, 404);
  }

  const no_leidas = await notificacionesModel.countUnreadForUser(req.user);

  return successResponse(res, 'Notificacion marcada como leida', {
    no_leidas
  });
};

const marcarTodasLeidas = async (req, res) => {
  await notificacionesModel.markAllAsRead(req.user);

  return successResponse(res, 'Notificaciones marcadas como leidas', {
    no_leidas: 0
  });
};

module.exports = {
  listNotificaciones,
  getResumen,
  marcarLeida,
  marcarTodasLeidas
};
