import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Сохраняем ник в localStorage, чтобы приложение знало, кто зашел
    localStorage.setItem('chat_username', username.trim());
    
    // Переходим в чат
    navigate('/chat');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
      <div className="w-full max-w-md p-8 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-center text-sky-400">Telegram Web</h1>
        <p className="text-slate-400 text-center mb-6 text-sm">
          Введите свой никнейм для входа в чат
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Ваш никнейм</label>
            <input 
              type="text" 
              placeholder="например: student_2026" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 rounded-xl font-semibold transition duration-200 shadow-lg shadow-sky-500/20"
          >
            Войти в чат
          </button>
        </form>
      </div>
    </div>
  );
}