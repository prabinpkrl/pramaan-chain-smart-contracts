function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
}) {
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${
        disabled || loading ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      )}

      {loading ? "Please wait..." : children}
    </button>
  );
}

export default Button;
