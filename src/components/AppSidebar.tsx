import React from 'react';
import { Home, BookOpen, User, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

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
    <Sidebar className={collapsed ? "w-20" : "w-60"} collapsible="icon">
      <SidebarContent className="py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="sr-only">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-6 px-0">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <SidebarMenuItem key={item.path} className="list-none">
                    <SidebarMenuButton
                      size="lg"
                      tooltip={item.label}
                      onClick={() => navigate(item.path)}
                      className={`w-full h-14 flex items-center justify-center transition-all duration-200 ${
                        isActive 
                          ? 'text-primary bg-primary/10' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon 
                        size={32} 
                        className={`!w-8 !h-8 flex-shrink-0 ${isActive ? 'animate-icon-bounce' : 'hover:animate-float'}`}
                      />
                      {!collapsed && <span className="ml-3">{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;