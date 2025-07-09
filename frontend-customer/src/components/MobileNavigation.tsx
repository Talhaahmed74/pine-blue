
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User, Settings, Info, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const MobileNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Rooms', path: '/rooms' },
    { icon: Info, label: 'About', path: '/about' },
    { icon: Phone, label: 'Contact', path: '/contact' },
    ...(user ? [
      { icon: User, label: 'Dashboard', path: '/dashboard' }
    ] : [])
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center py-2 px-3 ${
              location.pathname === path
                ? 'text-primary'
                : 'text-gray-600 hover:text-primary'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;
