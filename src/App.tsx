
import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SplashScreen from "./components/SplashScreen";
import { useSplashScreen } from "./hooks/useSplashScreen";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SignupStep1 from "./pages/SignupStep1";
import SignupStep2 from "./pages/SignupStep2";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProfileStatistics from "./pages/ProfileStatistics";
import ProfileBadges from "./pages/ProfileBadges";
import ProfileSettings from "./pages/ProfileSettings";
import ProfileNotifications from "./pages/ProfileNotifications";
import ProfileAbout from "./pages/ProfileAbout";
import ProfileEdit from "./pages/ProfileEdit";
import ProfileHelp from "./pages/ProfileHelp";
import ReadingPlanManagement from "./pages/ReadingPlanManagement";
import VerseList from "./pages/VerseList";
import Reading from "./pages/Reading";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/admin/AdminRoute";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

function App() {
  const { isVisible: splashVisible, isComplete: splashComplete } = useSplashScreen();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PWAUpdateNotification />
        
        {/* Splash Screen */}
        <SplashScreen isVisible={splashVisible} />
        
        {/* Main Application */}
        {splashComplete && (
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signup/step1" element={<SignupStep1 />} />
                <Route path="/signup/plan" element={<SignupStep2 />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/statistics" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileStatistics />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/badges" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileBadges />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reading-plan" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ReadingPlanManagement />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/verses" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <VerseList />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/profile/settings" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileSettings />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/notifications" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileNotifications />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/edit" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileEdit />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/about" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileAbout />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/help" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileHelp />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reading" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Reading />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AppLayout>
                          <Admin />
                        </AppLayout>
                      </AdminRoute>
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
