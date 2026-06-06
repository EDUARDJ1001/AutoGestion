require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { successResponse } = require('./utils/responses');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const clientesRoutes = require('./modules/clientes/clientes.routes');
const vehiculosRoutes = require('./modules/vehiculos/vehiculos.routes');
const visitasRoutes = require('./modules/visitas/visitas.routes');
const mecanicoRoutes = require('./modules/mecanico/mecanico.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');
const categoriasServicioRoutes = require('./modules/servicios/categoriasServicio.routes');
const inventarioRoutes = require('./modules/inventario/inventario.routes');
const productosRoutes = require('./modules/inventario/productos.routes');
const categoriasProductoRoutes = require('./modules/inventario/categoriasProducto.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.resolve(process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  fallthrough: false,
  index: false,
  maxAge: '1d'
}));

app.get('/api/health', (req, res) => {
  return successResponse(res, 'API del taller funcionando', {
    service: 'taller-automotriz-api',
    status: 'ok'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/mecanico', mecanicoRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/categorias-servicio', categoriasServicioRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias-producto', categoriasProductoRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
