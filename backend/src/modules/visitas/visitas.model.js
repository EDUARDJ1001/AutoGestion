const { query, transaction } = require('../../config/db');

const VISITA_SELECT = `
  v.id,
  v.cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono AS cliente_telefono,
  c.whatsapp AS cliente_whatsapp,
  v.vehiculo_id,
  ve.placa,
  ve.marca,
  ve.modelo,
  ve.anio,
  ve.color,
  v.recibido_por,
  CONCAT(ur.nombre, ' ', ur.apellido) AS recibido_por_nombre,
  v.mecanico_asignado_id,
  CONCAT(um.nombre, ' ', um.apellido) AS mecanico_asignado_nombre,
  v.fecha_ingreso,
  v.fecha_entrega_estimada,
  v.fecha_entrega_real,
  v.kilometraje_ingreso,
  v.motivo_visita,
  v.descripcion_problema,
  v.diagnostico,
  v.estado,
  v.observaciones,
  v.fecha_creacion,
  v.fecha_actualizacion
`;

const SERVICIO_ASIGNADO_SELECT = `
  vs.id,
  vs.visita_id,
  vs.servicio_id,
  s.nombre AS servicio_nombre,
  s.descripcion AS servicio_descripcion,
  s.precio_sugerido,
  s.categoria_servicio_id,
  cs.nombre AS categoria_nombre,
  vs.mecanico_id,
  CONCAT(um.nombre, ' ', um.apellido) AS mecanico_nombre,
  vs.descripcion_adicional,
  vs.precio_acordado,
  vs.cantidad,
  ROUND(COALESCE(vs.precio_acordado, 0) * vs.cantidad, 2) AS subtotal,
  vs.estado,
  vs.fecha_inicio,
  vs.fecha_fin,
  vs.observaciones,
  vs.fecha_creacion,
  vs.fecha_actualizacion
`;

const buildListFilters = ({ search, estado, clienteId, vehiculoId, mecanicoId, activas } = {}) => {
  const params = [];
  const filters = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      c.nombre ILIKE $${params.length}
      OR ve.placa ILIKE $${params.length}
      OR ve.marca ILIKE $${params.length}
      OR ve.modelo ILIKE $${params.length}
      OR v.motivo_visita ILIKE $${params.length}
    )`);
  }

  if (estado) {
    params.push(estado);
    filters.push(`v.estado = $${params.length}::estado_visita`);
  }

  if (clienteId) {
    params.push(clienteId);
    filters.push(`v.cliente_id = $${params.length}`);
  }

  if (vehiculoId) {
    params.push(vehiculoId);
    filters.push(`v.vehiculo_id = $${params.length}`);
  }

  if (mecanicoId) {
    params.push(mecanicoId);
    filters.push(`v.mecanico_asignado_id = $${params.length}`);
  }

  if (activas) {
    filters.push("v.estado NOT IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita)");
  }

  return {
    where: filters.length ? `WHERE ${filters.join(' AND ')}` : '',
    params
  };
};

const list = async (filters = {}) => {
  const { where, params } = buildListFilters(filters);
  const result = await query(
    `
      SELECT ${VISITA_SELECT}
      FROM visitas v
      INNER JOIN clientes c ON c.id = v.cliente_id
      INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
      LEFT JOIN usuarios ur ON ur.id = v.recibido_por
      LEFT JOIN usuarios um ON um.id = v.mecanico_asignado_id
      ${where}
      ORDER BY v.fecha_ingreso DESC, v.id DESC
    `,
    params
  );

  return result.rows;
};

const listActivas = async () => {
  return list({ activas: true });
};

const findById = async (id) => {
  const result = await query(
    `
      SELECT ${VISITA_SELECT}
      FROM visitas v
      INNER JOIN clientes c ON c.id = v.cliente_id
      INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
      LEFT JOIN usuarios ur ON ur.id = v.recibido_por
      LEFT JOIN usuarios um ON um.id = v.mecanico_asignado_id
      WHERE v.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const vehiculoPerteneceCliente = async (clienteId, vehiculoId) => {
  const result = await query(
    `
      SELECT v.id
      FROM vehiculos v
      INNER JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = $1
        AND v.cliente_id = $2
        AND v.estado = 'Activo'::estado_general
        AND c.estado = 'Activo'::estado_general
      LIMIT 1
    `,
    [vehiculoId, clienteId]
  );

  return Boolean(result.rows[0]);
};

const usuarioActivo = async (usuarioId, rol = null) => {
  if (!usuarioId) {
    return true;
  }

  const params = [usuarioId];
  const rolFilter = rol ? 'AND r.nombre = $2' : '';

  if (rol) {
    params.push(rol);
  }

  const result = await query(
    `
      SELECT u.id
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.id = $1
        AND u.estado = 'Activo'::estado_general
        ${rolFilter}
      LIMIT 1
    `,
    params
  );

  return Boolean(result.rows[0]);
};

const servicioActivo = async (servicioId) => {
  const result = await query(
    'SELECT id FROM servicios WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [servicioId, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const insertServicio = async (db, visitaId, servicio) => {
  const result = await db.query(
    `
      INSERT INTO visita_servicios (
        visita_id,
        servicio_id,
        mecanico_id,
        descripcion_adicional,
        precio_acordado,
        cantidad,
        estado,
        observaciones
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 1), COALESCE($7::estado_visita, 'Recibido'::estado_visita), $8)
      RETURNING id
    `,
    [
      visitaId,
      servicio.servicio_id,
      servicio.mecanico_id || null,
      servicio.descripcion_adicional || null,
      servicio.precio_acordado ?? null,
      servicio.cantidad ?? 1,
      servicio.estado || 'Recibido',
      servicio.observaciones || null
    ]
  );

  return result.rows[0].id;
};

const create = async (visita, servicios = []) => {
  const visitaId = await transaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO visitas (
          cliente_id,
          vehiculo_id,
          recibido_por,
          mecanico_asignado_id,
          fecha_entrega_estimada,
          kilometraje_ingreso,
          motivo_visita,
          descripcion_problema,
          diagnostico,
          estado,
          observaciones
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::estado_visita, 'Recibido'::estado_visita), $11)
        RETURNING id
      `,
      [
        visita.cliente_id,
        visita.vehiculo_id,
        visita.recibido_por || null,
        visita.mecanico_asignado_id || null,
        visita.fecha_entrega_estimada || null,
        visita.kilometraje_ingreso ?? null,
        visita.motivo_visita,
        visita.descripcion_problema || null,
        visita.diagnostico || null,
        visita.estado || 'Recibido',
        visita.observaciones || null
      ]
    );

    const newVisitaId = result.rows[0].id;

    for (const servicio of servicios) {
      await insertServicio(client, newVisitaId, servicio);
    }

    return newVisitaId;
  });

  return findById(visitaId);
};

const update = async (id, fields) => {
  const allowedFields = [
    'mecanico_asignado_id',
    'fecha_entrega_estimada',
    'fecha_entrega_real',
    'kilometraje_ingreso',
    'motivo_visita',
    'descripcion_problema',
    'diagnostico',
    'estado',
    'observaciones'
  ];
  const sets = [];
  const params = [];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      params.push(fields[field]);
      sets.push(field === 'estado' ? `${field} = $${params.length}::estado_visita` : `${field} = $${params.length}`);
    }
  });

  if (!sets.length) {
    return findById(id);
  }

  params.push(id);
  const result = await query(
    `
      UPDATE visitas
      SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING id
    `,
    params
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

const updateEstado = async (id, { estado, observaciones }) => {
  const result = await query(
    `
      UPDATE visitas
      SET
        estado = $1::estado_visita,
        observaciones = COALESCE($2, observaciones),
        fecha_entrega_real = CASE
          WHEN $1::estado_visita = 'Entregado'::estado_visita THEN COALESCE(fecha_entrega_real, NOW())
          ELSE fecha_entrega_real
        END
      WHERE id = $3
      RETURNING id
    `,
    [estado, observaciones || null, id]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

const addServicios = async (visitaId, servicios) => {
  await transaction(async (client) => {
    for (const servicio of servicios) {
      await insertServicio(client, visitaId, servicio);
    }
  });

  return getServicios(visitaId);
};

const getServicios = async (visitaId) => {
  const result = await query(
    `
      SELECT ${SERVICIO_ASIGNADO_SELECT}
      FROM visita_servicios vs
      INNER JOIN servicios s ON s.id = vs.servicio_id
      LEFT JOIN categorias_servicio cs ON cs.id = s.categoria_servicio_id
      LEFT JOIN usuarios um ON um.id = vs.mecanico_id
      WHERE vs.visita_id = $1
      ORDER BY vs.fecha_creacion ASC, vs.id ASC
    `,
    [visitaId]
  );

  return result.rows;
};

const getBitacora = async (visitaId) => {
  const result = await query(
    `
      SELECT
        ve.id,
        ve.visita_id,
        ve.estado_anterior,
        ve.estado_nuevo,
        ve.comentario,
        ve.usuario_id,
        CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
        ve.fecha_creacion
      FROM visita_estados ve
      LEFT JOIN usuarios u ON u.id = ve.usuario_id
      WHERE ve.visita_id = $1
      ORDER BY ve.fecha_creacion ASC, ve.id ASC
    `,
    [visitaId]
  );

  return result.rows;
};

module.exports = {
  list,
  listActivas,
  findById,
  vehiculoPerteneceCliente,
  usuarioActivo,
  servicioActivo,
  create,
  update,
  updateEstado,
  addServicios,
  getServicios,
  getBitacora
};
