// Example brutal Header
export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-4 border-black bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-5 flex justify-between items-center">
        <div className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
          VAULTVANI
        </div>

        <nav className="hidden md:flex gap-10 text-xl font-bold uppercase">
          <button className="hover:text-yellow-600 transition-colors">
            UPLOAD
          </button>
          <button className="hover:text-yellow-600 transition-colors">
            BROWSE
          </button>
          <button className="hover:text-yellow-600 transition-colors">
            CHAT
          </button>
          <button className="hover:text-yellow-600 transition-colors">
            LOGOUT
          </button>
        </nav>

        {/* Mobile menu button if needed */}
      </div>
    </header>
  );
}
