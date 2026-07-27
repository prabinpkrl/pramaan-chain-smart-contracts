function Input({
  label,
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  required = false,
  accept,
}) {
  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">{label}</label>

      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        accept={accept}
        className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default Input;
