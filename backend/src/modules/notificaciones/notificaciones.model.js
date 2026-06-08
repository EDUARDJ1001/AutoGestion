const { query, transaction } = require('../../config/db');

const NOTIFICACION_SELECT = `
  n.id,
  n.tipo,
  n.titulo,
  n.mensaje,
  n.severidad,
  n.roles_destino,
  n.usuario_destino_id,
  n.visita_id,
  n.vehiculo_id,
  n.clave_unica,
  n.metadata,
  n.resuelta,
  n.fecha_resuelta,
  n.fecha_creacion,
  CASE WHEN nl.usuario_id IS NULL THEN false ELSE true END AS leida,
  nl.fecha_leida
`;

const operationalRoles = ['Admin', 'Cajero'];

const visibleFilter = (user, startIndex = 1) => ({
  sql: `
    (
      n.usuario_destino_id = $${startIndex}
      OR (
        n.usuario_destino_id IS NULL
        AND $${startIndex + 1} = ANY(n.roles_destino)
      )
    )
  `,
  params: [user.id, user.rol]
});

const upsertNotification = async (client, notification) => {
  await client.query(
    `
      INSERT INTO notificaciones (
        tipo,
        titulo,
        mensaje,
        severidad,
        roles_destino,
        usuario_destino_id,
        visita_id,
        vehiculo_id,
        clave_unica,
        metadata,
        resuelta,
        fecha_resuelta
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::jsonb, '{}'::jsonb), false, NULL)
      ON CONFLICT (clave_unica) DO UPDATE
      SET
        titulo = EXCLUDED.titulo,
        mensaje = EXCLUDED.mensaje,
        severidad = EXCLUDED.severidad,
        roles_destino = EXCLUDED.roles_destino,
        metadata = EXCLUDED.metadata,
        resuelta = false,
        fecha_resuelta = NULL,
        fecha_actualizacion = NOW()
    `,
    [
      notification.tipo,
      notification.titulo,
      notification.mensaje,
      notification.severidad || 'info',
      notification.roles_destino || operationalRoles,
      notification.usuario_destino_id || null,
      notification.visita_id || null,
      notification.vehiculo_id || null,
      notification.clave_unica,
      JSON.stringify(notification.metadata || {})
    ]
  );
};

const resolveMissingOperationalAlerts = async (client, activeKeys, prefix) => {
  await client.query(
    `
      UPDATE notificaciones
      SET
        resuelta = true,
        fecha_resuelta = COALESCE(fecha_resuelta, NOW()),
        fecha_actualizacion = NOW()
      WHERE tipo = $1
        AND resuelta = false
        AND NOT (clave_unica = ANY($2::text[]))
    `,
    [prefix, activeKeys]
  );
};

const syncSinAvance = async (client) => {
  const result = await client.query(
    `
      SELECT *
      FROM vista_progreso_visitas
      WHERE alerta_sin_avance = true
        AND estado_visita NOT IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita)
    `
  );
  const activeKeys = [];

  for (const row of result.rows) {
    const key = `sin_avance:${row.visita_id}`;
    activeKeys.push(key);
    await upsertNotification(client, {
      tipo: 'sin_avance',
      titulo: 'Vehiculo sin avance',
      mensaje: `${row.placa || row.marca || 'Vehiculo'} lleva ${Number(row.horas_sin_avance || 0).toFixed(0)}h sin avance en ${row.etapa_actual || 'su proceso'}.`,
      severidad: 'danger',
      roles_destino: operationalRoles,
      visita_id: row.visita_id,
      vehiculo_id: row.vehiculo_id,
      clave_unica: key,
      metadata: {
        cliente: row.cliente,
        placa: row.placa,
        flujo_trabajo: row.flujo_trabajo,
        etapa_actual: row.etapa_actual,
        horas_sin_avance: row.horas_sin_avance
      }
    });
  }

  await resolveMissingOperationalAlerts(client, activeKeys, 'sin_avance');
};

const syncEntregas = async (client) => {
  const result = await client.query(
    `
      SELECT
        v.id AS visita_id,
        v.vehiculo_id,
        v.fecha_entrega_estimada,
        v.estado,
        c.nombre AS cliente,
        ve.placa,
        ve.marca,
        ve.modelo,
        EXTRACT(EPOCH FROM (v.fecha_entrega_estimada - NOW())) / 3600 AS horas_para_entrega
      FROM visitas v
      INNER JOIN clientes c ON c.id = v.cliente_id
      INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
      WHERE v.fecha_entrega_estimada IS NOT NULL
        AND v.estado NOT IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita)
        AND v.fecha_entrega_estimada <= NOW() + INTERVAL '24 hours'
    `
  );
  const activeKeys = [];

  for (const row of result.rows) {
    const overdue = Number(row.horas_para_entrega) < 0;
    const type = overdue ? 'entrega_vencida' : 'entrega_proxima';
    const key = `${type}:${row.visita_id}`;
    activeKeys.push(key);

    await upsertNotification(client, {
      tipo: type,
      titulo: overdue ? 'Entrega estimada vencida' : 'Entrega estimada proxima',
      mensaje: overdue
        ? `${row.placa || row.marca || 'Vehiculo'} supero su entrega estimada.`
        : `${row.placa || row.marca || 'Vehiculo'} tiene entrega estimada en ${Math.max(Number(row.horas_para_entrega || 0), 0).toFixed(0)}h.`,
      severidad: overdue ? 'danger' : 'warning',
      roles_destino: operationalRoles,
      visita_id: row.visita_id,
      vehiculo_id: row.vehiculo_id,
      clave_unica: key,
      metadata: {
        cliente: row.cliente,
        placa: row.placa,
        marca: row.marca,
        modelo: row.modelo,
        fecha_entrega_estimada: row.fecha_entrega_estimada,
        horas_para_entrega: row.horas_para_entrega
      }
    });
  }

  await resolveMissingOperationalAlerts(client, activeKeys.filter((key) => key.startsWith('entrega_proxima')), 'entrega_proxima');
  await resolveMissingOperationalAlerts(client, activeKeys.filter((key) => key.startsWith('entrega_vencida')), 'entrega_vencida');
};

const syncOperationalNotifications = async () => {
  await transaction(async (client) => {
    await syncSinAvance(client);
    await syncEntregas(client);
  });
};

const notifyTrabajoFinalizado = async (visita) => {
  if (!visita) return;

  await transaction(async (client) => {
    await upsertNotification(client, {
      tipo: 'trabajo_finalizado',
      titulo: 'Trabajo finalizado por mecanico',
      mensaje: `${visita.placa || visita.marca || 'Vehiculo'} fue marcado como finalizado.`,
      severidad: 'success',
      roles_destino: operationalRoles,
      visita_id: visita.id,
      vehiculo_id: visita.vehiculo_id,
      clave_unica: `trabajo_finalizado:${visita.id}`,
      metadata: {
        cliente: visita.cliente_nombre,
        placa: visita.placa,
        mecanico: visita.mecanico_asignado_nombre,
        estado: visita.estado
      }
    });
  });
};

const listForUser = async (user, { unreadOnly = false, limit = 30 } = {}) => {
  const filter = visibleFilter(user);
  const params = [...filter.params];
  const unreadFilter = unreadOnly ? 'AND nl.usuario_id IS NULL' : '';

  params.push(limit);

  const result = await query(
    `
      SELECT ${NOTIFICACION_SELECT}
      FROM notificaciones n
      LEFT JOIN notificacion_lecturas nl ON nl.notificacion_id = n.id AND nl.usuario_id = $1
      WHERE ${filter.sql}
        AND n.resuelta = false
        ${unreadFilter}
      ORDER BY
        CASE n.severidad
          WHEN 'danger' THEN 0
          WHEN 'warning' THEN 1
          WHEN 'success' THEN 2
          ELSE 3
        END,
        n.fecha_actualizacion DESC,
        n.id DESC
      LIMIT $3
    `,
    params
  );

  return result.rows;
};

const countUnreadForUser = async (user) => {
  const filter = visibleFilter(user);
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM notificaciones n
      LEFT JOIN notificacion_lecturas nl ON nl.notificacion_id = n.id AND nl.usuario_id = $1
      WHERE ${filter.sql}
        AND n.resuelta = false
        AND nl.usuario_id IS NULL
    `,
    filter.params
  );

  return result.rows[0]?.total || 0;
};

const markAsRead = async (user, notificationId) => {
  const filter = visibleFilter(user, 2);
  const exists = await query(
    `
      SELECT n.id
      FROM notificaciones n
      WHERE n.id = $1
        AND ${filter.sql}
      LIMIT 1
    `,
    [notificationId, ...filter.params]
  );

  if (!exists.rows[0]) {
    return false;
  }

  await query(
    `
      INSERT INTO notificacion_lecturas (notificacion_id, usuario_id)
      VALUES ($1, $2)
      ON CONFLICT (notificacion_id, usuario_id) DO UPDATE
      SET fecha_leida = NOW()
    `,
    [notificationId, user.id]
  );

  return true;
};

const markAllAsRead = async (user) => {
  const filter = visibleFilter(user);
  await query(
    `
      INSERT INTO notificacion_lecturas (notificacion_id, usuario_id)
      SELECT n.id, $1
      FROM notificaciones n
      LEFT JOIN notificacion_lecturas nl ON nl.notificacion_id = n.id AND nl.usuario_id = $1
      WHERE ${filter.sql}
        AND n.resuelta = false
        AND nl.usuario_id IS NULL
      ON CONFLICT (notificacion_id, usuario_id) DO UPDATE
      SET fecha_leida = NOW()
    `,
    filter.params
  );
};

module.exports = {
  syncOperationalNotifications,
  notifyTrabajoFinalizado,
  listForUser,
  countUnreadForUser,
  markAsRead,
  markAllAsRead
};
