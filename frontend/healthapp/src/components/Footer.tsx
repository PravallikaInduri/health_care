import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-6 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
        <p>© 2026 Healthcare Patient Portal</p>
        <div className="flex items-center gap-5 text-sm">
          <Link to="/login" className="text-slate-300 hover:text-white transition">
            Sign in
          </Link>
          <Link
            to="/register"
            className="font-semibold text-brand-300 hover:text-white transition"
          >
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;