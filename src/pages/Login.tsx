
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { signIn } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = React.useState(true);
  
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  const handleSubmit = async (data: { email: string; password: string; name?: string; startDate?: Date }) => {
    const result = await signIn(data.email, data.password);
    if (result.success) {
      navigate('/dashboard');
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

export default Login;
