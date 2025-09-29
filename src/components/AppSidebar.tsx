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
    <Sidebar className={collapsed ? "w-16" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={collapsed ? "px-2 py-4 space-y-2" : ""}>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      className={`transition-all duration-200 ${
                        collapsed 
                          ? 'h-14 w-14 rounded-lg flex items-center justify-center p-0 mx-auto' 
                          : 'flex items-center justify-start px-3 py-2'
                      } ${
                        isActive 
                          ? 'text-primary bg-primary/10 border border-primary/20' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon 
                        size={collapsed ? 24 : 20} 
                        className={`${isActive ? 'animate-pulse' : ''} ${collapsed ? '' : 'mr-3'}`} 
                      />
                      {!collapsed && <span>{item.label}</span>}
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