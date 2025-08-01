
/**
 * Barre de navigation principale de l'application
 * Adaptée selon les permissions utilisateur (affichage admin si applicable)
 */

import React from 'react';
import { Home, BookOpen, User, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();

  const navItems = [
    {
      icon: Home,
      label: 'Accueil',
      path: '/dashboard',
      show: true
    },
    {
      icon: BookOpen,
      label: 'Lecture',
      path: '/reading',
      show: true
    },
    {
      icon: User,
      label: 'Profil',
      path: '/profile',
      show: true
    },
    {
      icon: Settings,
      label: 'Admin',
      path: '/admin',
      show: isAdmin
    }
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 animate-slide-up">
      <div className="flex justify-around items-center h-16 px-4">
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                isActive
                  ? 'text-green-600 bg-green-50 animate-bounce-gentle'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Icon size={20} className={isActive ? 'animate-heart-beat' : ''} />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavBar;
