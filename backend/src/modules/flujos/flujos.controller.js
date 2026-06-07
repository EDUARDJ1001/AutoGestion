const flujosModel = require('./flujos.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const listFlujos = async (req, res) => {
  const flujos = await flujosModel.listFlujosWithEtapas({
    estado: req.query.estado || 'Activo'
  });

  return successResponse(res, 'Flujos de trabajo obtenidos correctamente', {
    flujos
  });
};

const getFlujo = async (req, res) => {
  const flujo = await flujosModel.findFlujoById(Number(req.params.id));

  if (!flujo) {
    return errorResponse(res, 'Flujo de trabajo no encontrado', undefined, 404);
  }

  const etapas = await flujosModel.listEtapasByFlujo(flujo.id, {
    estado: req.query.estado || 'Activo'
  });

  return successResponse(res, 'Flujo de trabajo obtenido correctamente', {
    flujo,
    etapas
  });
};

module.exports = {
  listFlujos,
  getFlujo
};
