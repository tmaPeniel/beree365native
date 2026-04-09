
import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BadgeNotificationProvider } from "@/contexts/BadgeNotificationContext";
import BadgeUnlockPopup from "@/components/notifications/BadgeUnlockPopup";
import SplashScreen from "./components/SplashScreen";
import Onboarding from "./components/Onboarding";
import { useSplashScreen } from "./hooks/useSplashScreen";
import { useLocalStorage } from "./hooks/useLocalStorage";
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
import ProfilePrivacy from "./pages/ProfilePrivacy";
import Terms from "./pages/Terms";
import CookiesPolicy from "./pages/CookiesPolicy";
import CookieConsentBanner from "./components/cookies/CookieConsentBanner";
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
  const [onboardingDone, setOnboardingDone] = useLocalStorage('beree-onboarding-completed', false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        
        {/* Splash Screen */}
        <SplashScreen isVisible={splashVisible} />

        {/* Onboarding */}
        {splashComplete && !onboardingDone && (
          <Onboarding onComplete={() => setOnboardingDone(true)} />
        )}
        
        {/* Main Application */}
        {splashComplete && onboardingDone && (
          <BrowserRouter>
            <AuthProvider>
              <BadgeNotificationProvider>
                <BadgeUnlockPopup />
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signup/step1" element={<SignupStep1 />} />
                <Route path="/signup/plan" element={<SignupStep2 />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<CookiesPolicy />} />
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
                  path="/profile/privacy" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfilePrivacy />
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
              </BadgeNotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
