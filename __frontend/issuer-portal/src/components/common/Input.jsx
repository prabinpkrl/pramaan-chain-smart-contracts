function Input({
  label,
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
}) {
  const inputId = id || name;

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block mb-2 font-medium">
        {label}
      </label>

      <input
        id={inputId}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default Input;
