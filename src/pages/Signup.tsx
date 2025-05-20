
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { signUp } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

const Signup = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = React.useState(false);
  
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  const handleSubmit = async (data: { email: string; password: string; name?: string; startDate?: Date }) => {
    if (data.name && data.startDate) {
      const result = await signUp(data.email, data.password, data.name, data.startDate);
      if (result.success) {
        navigate('/dashboard');
      }
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
      <AuthForm 
        isLogin={isLogin} 
        toggleForm={toggleForm} 
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Signup;
