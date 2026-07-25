function LoadingOverlay({ message }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-96 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>

        <h2 className="text-xl font-semibold mt-6">Processing Transaction</h2>

        <p className="text-gray-600 mt-3">{message}</p>
      </div>
    </div>
  );
}

export default LoadingOverlay;
