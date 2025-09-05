
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SplashScreen from "./components/SplashScreen";
import { useSplashScreen } from "./hooks/useSplashScreen";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProfileStatistics from "./pages/ProfileStatistics";
import ProfileBadges from "./pages/ProfileBadges";
import ProfileSettings from "./pages/ProfileSettings";
import ProfileAbout from "./pages/ProfileAbout";
import ProfileEdit from "./pages/ProfileEdit";
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
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/statistics" 
                  element={
                    <ProtectedRoute>
                      <ProfileStatistics />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/badges" 
                  element={
                    <ProtectedRoute>
                      <ProfileBadges />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reading-plan" 
                  element={
                    <ProtectedRoute>
                      <ReadingPlanManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/verses" 
                  element={
                    <ProtectedRoute>
                      <VerseList />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/profile/settings" 
                  element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/edit" 
                  element={
                    <ProtectedRoute>
                      <ProfileEdit />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile/about" 
                  element={
                    <ProtectedRoute>
                      <ProfileAbout />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reading" 
                  element={
                    <ProtectedRoute>
                      <Reading />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <Admin />
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
