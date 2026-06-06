import DashboardPage from '../pages/DashboardPage';
import ModulePage from '../pages/ModulePage';

function AppRoutes({ activeModule, ...props }) {
  if (activeModule === 'dashboard') {
    return <DashboardPage data={props.data} loading={props.loading} />;
  }

  return <ModulePage moduleKey={activeModule} {...props} />;
}

export default AppRoutes;
