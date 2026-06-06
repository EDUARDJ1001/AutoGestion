const clientesModel = require('./clientes.model');
const vehiculosModel = require('../vehiculos/vehiculos.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const normalizeNullableString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const buildClientePayload = (body, partial = false) => {
  const fields = {};
  const textFields = [
    'nombre',
    'identidad_rtn',
    'telefono',
    'whatsapp',
    'email',
    'direccion',
    'observaciones',
    'estado'
  ];

  textFields.forEach((field) => {
    if (!partial || body[field] !== undefined) {
      if (field === 'nombre') {
        fields[field] = String(body[field]).trim();
      } else if (field === 'estado') {
        fields[field] = body[field] === undefined ? undefined : String(body[field]).trim();
      } else {
        fields[field] = normalizeNullableString(body[field]);
      }
    }
  });

  return fields;
};

const listClientes = async (req, res) => {
  const clientes = await clientesModel.list({
    search: req.query.search,
    estado: req.query.estado
  });

  return successResponse(res, 'Clientes obtenidos correctamente', {
    clientes
  });
};

const getCliente = async (req, res) => {
  const id = Number(req.params.id);
  const cliente = await clientesModel.findById(id);

  if (!cliente) {
    return errorResponse(res, 'Cliente no encontrado', undefined, 404);
  }

  const vehiculos = await vehiculosModel.listByCliente(id);

  return successResponse(res, 'Cliente obtenido correctamente', {
    cliente,
    vehiculos
  });
};

const createCliente = async (req, res) => {
  const cliente = await clientesModel.create(buildClientePayload(req.body));

  return successResponse(res, 'Cliente creado correctamente', { cliente }, 201);
};

const updateCliente = async (req, res) => {
  const cliente = await clientesModel.update(
    Number(req.params.id),
    buildClientePayload(req.body, true)
  );

  if (!cliente) {
    return errorResponse(res, 'Cliente no encontrado', undefined, 404);
  }

  return successResponse(res, 'Cliente actualizado correctamente', { cliente });
};

const updateEstado = async (req, res) => {
  const cliente = await clientesModel.updateEstado(Number(req.params.id), req.body.estado);

  if (!cliente) {
    return errorResponse(res, 'Cliente no encontrado', undefined, 404);
  }

  return successResponse(res, 'Estado de cliente actualizado correctamente', { cliente });
};

const listVehiculosByCliente = async (req, res) => {
  const clienteId = Number(req.params.clienteId);
  const cliente = await clientesModel.findById(clienteId);

  if (!cliente) {
    return errorResponse(res, 'Cliente no encontrado', undefined, 404);
  }

  const vehiculos = await vehiculosModel.listByCliente(clienteId);

  return successResponse(res, 'Vehiculos del cliente obtenidos correctamente', {
    cliente,
    vehiculos
  });
};

module.exports = {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  updateEstado,
  listVehiculosByCliente
};
