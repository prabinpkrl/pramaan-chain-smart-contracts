function Badge({ status }) {
  const styles = {
    ACTIVE: "bg-green-100 text-green-700",
    REVOKED: "bg-red-100 text-red-700",
    NOT_FOUND: "bg-gray-100 text-gray-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    ISSUED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

export default Badge;
