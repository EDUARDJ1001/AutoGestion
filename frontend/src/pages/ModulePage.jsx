import { Pencil, Plus, Power, Search } from 'lucide-react';
import { getListForModule, hasRole, moduleConfig } from '../config/moduleConfig';
import { moduleTitles } from '../routes/modules';
import { filterRows } from '../utils/formatters';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

function ModulePage({
  moduleKey,
  session,
  data,
  loading,
  error,
  search,
  onSearch,
  onCreate,
  onEdit,
  onToggleStatus,
  onRefresh
}) {
  const config = moduleConfig[moduleKey];
  const rows = filterRows(getListForModule(moduleKey, data), search);
  const canCreate = hasRole(session, config?.createRoles);
  const canEdit = hasRole(session, config?.editRoles);
  const canStatus = hasRole(session, config?.statusRoles);

  return (
    <section className="panel">
      <div className="toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            placeholder={`Buscar en ${moduleTitles[moduleKey].toLowerCase()}`}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>

        {canCreate ? (
          <button className="primary-button compact-button" type="button" onClick={() => onCreate(moduleKey)}>
            <Plus size={18} aria-hidden="true" />
            Nuevo
          </button>
        ) : null}
      </div>

      {loading ? <EmptyState text="Cargando datos..." /> : null}
      {error ? <ErrorState text={error} onRetry={onRefresh} /> : null}
      {!loading && !error ? (
        <DataTable
          rows={rows}
          columns={config?.columns || []}
          actions={canEdit || canStatus ? (row) => (
            <div className="row-actions">
              {canEdit ? (
                <button className="icon-button table-action" type="button" onClick={() => onEdit(moduleKey, row)} aria-label="Editar">
                  <Pencil size={17} aria-hidden="true" />
                </button>
              ) : null}
              {canStatus && row.estado ? (
                <button className="icon-button table-action" type="button" onClick={() => onToggleStatus(moduleKey, row)} aria-label="Cambiar estado">
                  <Power size={17} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}
        />
      ) : null}
    </section>
  );
}

export default ModulePage;
