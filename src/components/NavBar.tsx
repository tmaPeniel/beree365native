
import { Link, useLocation } from 'react-router-dom';
import { BarChart2, BookOpen, User } from 'lucide-react';

const NavBar = () => {
  const location = useLocation();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-sm z-50">
      <div className="flex justify-around items-center h-16">
        <Link 
          to="/dashboard" 
          className={`nav-item ${location.pathname === '/dashboard' ? 'nav-item-active' : 'text-gray-500'}`}
        >
          <BarChart2 className="h-5 w-5 mb-1" />
          <span>Dashboard</span>
        </Link>
        <Link 
          to="/reading" 
          className={`nav-item ${location.pathname === '/reading' ? 'nav-item-active' : 'text-gray-500'}`}
        >
          <BookOpen className="h-5 w-5 mb-1" />
          <span>Planner 365</span>
        </Link>
        <Link 
          to="/profile" 
          className={`nav-item ${location.pathname === '/profile' ? 'nav-item-active' : 'text-gray-500'}`}
        >
          <User className="h-5 w-5 mb-1" />
          <span>Profil</span>
        </Link>
      </div>
    </div>
  );
};

export default NavBar;
