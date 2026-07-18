import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <header
      className="
        fixed
        top-0
        left-0
        w-full
        z-50
        bg-white/80
        backdrop-blur-xl
        border-b
        border-slate-200
      "
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-20 flex items-center justify-between">

          {/* Logo */}

          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div
              className="
                w-12
                h-12
                rounded-xl
                bg-gradient-to-r
                from-blue-600
                to-cyan-500
                flex
                items-center
                justify-center
                text-white
                font-bold
                text-xl
              "
            >
              H
            </div>

            <div>
              <h2 className="font-bold text-2xl text-slate-900">
                MEDICONNECT
              </h2>

              <p className="text-xs text-slate-500">
                Healthcare Portal
              </p>
            </div>
          </Link>

          {/* Navigation */}

          <nav className="hidden md:flex gap-8 text-slate-700 font-medium">

            <Link
              to="/"
              className="hover:text-blue-600 transition"
            >
              Home
            </Link>

            <Link
              to="/about"
              className="hover:text-blue-600 transition"
            >
              About
            </Link>

            <Link
              to="/services"
              className="hover:text-blue-600 transition"
            >
              Services
            </Link>

            <Link
              to="/contact"
              className="hover:text-blue-600 transition"
            >
              Contact
            </Link>

          </nav>

          {/* Buttons */}

          <div className="flex items-center gap-4">

            <Link
              to="/login"
              className="
                px-5
                py-2.5
                rounded-xl
                border
                border-slate-300
                text-slate-700
                hover:bg-slate-100
                transition
              "
            >
              Login
            </Link>

            <Link
              to="/register"
              className="
                px-5
                py-2.5
                rounded-xl
                bg-blue-600
                text-white
                hover:bg-blue-700
                transition
              "
            >
              Register
            </Link>

          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;