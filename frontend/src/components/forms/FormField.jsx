function FormField({ field, mode, value, onChange }) {
  const required = Boolean(field.required || (mode === 'create' && field.requiredOnCreate));
  const integerOnly = field.valueType === 'integer';
  const handleInputChange = (event) => {
    const integerPart = event.target.value.split(/[.,]/)[0];
    const nextValue = integerOnly
      ? integerPart.replace(/[^\d]/g, '')
      : event.target.value;

    onChange(nextValue);
  };

  if (field.type === 'textarea') {
    return (
      <label className="field field-wide">
        {field.label}
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          rows={3}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    const options = (field.options || []).map((option) => (
      typeof option === 'string' ? { value: option, label: option } : option
    ));

    return (
      <label className="field">
        {field.label}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        >
          <option value="">Sin seleccionar</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      {field.label}
      <input
        type={field.type || 'text'}
        value={value}
        onChange={handleInputChange}
        onKeyDown={(event) => {
          if (integerOnly && ['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
            event.preventDefault();
          }
        }}
        required={required}
        min={field.min}
        step={integerOnly ? 1 : field.step}
        inputMode={integerOnly ? 'numeric' : undefined}
        pattern={integerOnly ? '[0-9]*' : undefined}
        minLength={field.minLength}
      />
    </label>
  );
}

export default FormField;
