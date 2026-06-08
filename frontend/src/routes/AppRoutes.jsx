import DashboardPage from '../pages/DashboardPage';
import MecanicoPage from '../pages/MecanicoPage';
import ModulePage from '../pages/ModulePage';
import ReportesPage from '../pages/ReportesPage';

function AppRoutes({ activeModule, ...props }) {
  if (activeModule === 'dashboard') {
    return <DashboardPage data={props.data} loading={props.loading} error={props.error} onRefresh={props.onRefresh} />;
  }

  if (activeModule === 'mecanico') {
    return <MecanicoPage {...props} />;
  }

  if (activeModule === 'reportes') {
    return <ReportesPage {...props} />;
  }

  return <ModulePage moduleKey={activeModule} {...props} />;
}

export default AppRoutes;
