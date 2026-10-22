export default function FormInput({ id, label, error, hint, ...props }) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return <div className="form-field">
    <label htmlFor={id}>{label}</label>
    <input id={id} aria-invalid={Boolean(error)} aria-describedby={messageId} {...props} />
    {error && <p className="field-message field-error" id={messageId} role="alert">{error}</p>}
    {!error && hint && <p className="field-message" id={messageId}>{hint}</p>}
  </div>;
}
