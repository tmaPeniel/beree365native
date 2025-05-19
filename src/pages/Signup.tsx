
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { toast } from 'sonner';

const Signup = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = React.useState(false);
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  const handleSubmit = (data: { email: string; password: string; name?: string }) => {
    // Simulate signup/login
    console.log('Auth data:', data);
    
    // Show success message
    toast.success(isLogin ? 'Connexion réussie!' : 'Compte créé avec succès!');
    
    // Redirect to dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center animate-fade-in">
      <AuthForm 
        isLogin={isLogin} 
        toggleForm={toggleForm} 
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Signup;
