import DashboardPage from '../pages/DashboardPage';
import MecanicoPage from '../pages/MecanicoPage';
import ModulePage from '../pages/ModulePage';

function AppRoutes({ activeModule, ...props }) {
  if (activeModule === 'dashboard') {
    return <DashboardPage data={props.data} loading={props.loading} />;
  }

  if (activeModule === 'mecanico') {
    return <MecanicoPage {...props} />;
  }

  return <ModulePage moduleKey={activeModule} {...props} />;
}

export default AppRoutes;
