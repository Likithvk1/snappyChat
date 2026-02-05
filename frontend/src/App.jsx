import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatLayout from './components/Chat/ChatLayout';
import { Loader } from 'lucide-react';

function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    )
  }

  if (user) {
    return <ChatLayout />;
  }

  return (
    <div>
      {view === 'login' ? (
        <Login onRegisterClick={() => setView('register')} />
      ) : (
        <Register onLoginClick={() => setView('login')} />
      )}
    </div>
  );
}

export default App;
