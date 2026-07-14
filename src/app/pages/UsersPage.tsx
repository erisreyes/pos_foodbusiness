import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { Toaster } from '../components/ui/sonner';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F4F8F3]">
      <Toaster richColors />
      <AppHeader onLogout={handleLogout} />
      <div className="p-6">User Management (placeholder)</div>
    </div>
  );
}
