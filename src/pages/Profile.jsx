import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getProfile();
  }, []);

  // Получаем текущий ник, если он уже был сохранен
  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      if (data) setUsername(data.username);
    }
  };

  // Сохранение ника в базу данных
  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('Ошибка: пользователь не авторизован!');
      navigate('/');
      return;
    }

    const updates = {
      id: user.id,
      username,
      avatar_url: '',
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    setLoading(false);

    if (error) {
      alert('Ошибка при сохранении ника: ' + error.message);
    } else {
      alert('Ник успешно сохранен!');
      navigate('/chat');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
      <div className="w-full max-w-md p-8 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-center text-sky-400">Ваш Профиль</h1>
        <p className="text-slate-400 text-center mb-6 text-sm">
          Придумайте уникальный никнейм для поиска
        </p>

        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Никнейм (username)</label>
            <input 
              type="text" 
              placeholder="например: telegram_king" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition duration-200 shadow-lg shadow-emerald-500/20"
          >
            {loading ? 'Сохранение...' : 'Сохранить и продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
}