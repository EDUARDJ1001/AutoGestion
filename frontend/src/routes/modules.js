import {
  Boxes,
  BriefcaseBusiness,
  Car,
  ClipboardList,
  LayoutDashboard,
  Users,
  UserRoundCog,
  Wrench
} from 'lucide-react';

export const modules = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Cajero'] },
  { key: 'usuarios', label: 'Usuarios', icon: UserRoundCog, roles: ['Admin'] },
  { key: 'clientes', label: 'Clientes', icon: Users, roles: ['Admin', 'Cajero'] },
  { key: 'vehiculos', label: 'Vehiculos', icon: Car, roles: ['Admin', 'Cajero'] },
  { key: 'visitas', label: 'Visitas', icon: ClipboardList, roles: ['Admin', 'Cajero'] },
  { key: 'servicios', label: 'Servicios', icon: BriefcaseBusiness, roles: ['Admin', 'Cajero'] },
  { key: 'inventario', label: 'Inventario', icon: Boxes, roles: ['Admin', 'Cajero', 'Mecanico'] },
  { key: 'mecanico', label: 'Panel mecanico', icon: Wrench, roles: ['Mecanico'] }
];

export const moduleTitles = Object.fromEntries(modules.map((module) => [module.key, module.label]));
