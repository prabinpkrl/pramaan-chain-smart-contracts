function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-700">PramaanChain</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-700 font-medium">Mahesh Ayer</span>

        <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
