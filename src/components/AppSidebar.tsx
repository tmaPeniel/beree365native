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
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      className={`transition-all duration-200 ${
                        isActive 
                          ? 'text-primary bg-primary/10' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon size={40} className={isActive ? 'animate-icon-bounce' : 'hover:animate-float'} />
                      {!collapsed && <span className="ml-2">{item.label}</span>}
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