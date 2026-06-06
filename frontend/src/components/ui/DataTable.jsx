import EmptyState from './EmptyState';

function DataTable({ rows, columns, actions }) {
  if (!rows.length) {
    return <EmptyState text="Sin registros para mostrar" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => <th key={label}>{label}</th>)}
            {actions ? <th>Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.visita_id || index}>
              {columns.map(([key, label, formatter]) => (
                <td data-label={label} key={key}>
                  {formatter ? formatter(row[key], row) : row[key] ?? 'Sin dato'}
                </td>
              ))}
              {actions ? <td data-label="Acciones">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
