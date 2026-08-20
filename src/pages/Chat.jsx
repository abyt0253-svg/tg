import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [publicGroups] = useState(['Общий чат', 'Учитель', 'Друзья']);
  const [privateChats, setPrivateChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState('Общий чат');
  const [newMessage, setNewMessage] = useState('');
  
  const username = localStorage.getItem('chat_username');
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Универсальный ключ комнаты для двоих (сортируем имена по алфавиту)
  const getPrivateRoomName = (user1, user2) => {
    return [user1, user2].sort().join('___');
  };

  useEffect(() => {
    if (!username) {
      navigate('/');
      return;
    }

    fetchPrivateChats();
    fetchMessages();

    // Слушаем сообщения для активного чата
    const msgChannel = supabase.channel('realtime_msgs_' + username)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Если пришло сообщение в текущий активный чат
        if (payload.new.recipient === activeChat) {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }

        // ДИНАМИЧЕСКИЙ АВТО-ЧАТ: Если кто-то написал нам лично, а чата в списке еще нет — создаем его автоматически!
        if (payload.new.recipient.includes('___') && payload.new.recipient.includes(username)) {
          const room = payload.new.recipient;
          const sender = payload.new.sender;
          
          if (sender !== username) {
            // Проверяем, есть ли уже этот чат в нашем списке
            supabase
              .from('user_chats')
              .select('*')
              .eq('username', username)
              .eq('room', room)
              .then(({ data }) => {
                if (!data || data.length === 0) {
                  // Добавляем в базу для текущего пользователя
                  supabase.from('user_chats').insert([
                    { username: username, room: room, display_name: sender }
                  ]).then(() => {
                    fetchPrivateChats();
                  });
                }
              });
          }
        }
      })
      .subscribe();

    // Слушаем новые личные чаты через таблицу user_chats
    const chatChannel = supabase.channel('realtime_chats_' + username)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_chats' }, (payload) => {
        if (payload.new.username === username) {
          fetchPrivateChats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [activeChat, username]);

  // Загружаем личные чаты из базы данных
  const fetchPrivateChats = async () => {
    const { data } = await supabase
      .from('user_chats')
      .select('*')
      .eq('username', username);
    
    if (data) {
      setPrivateChats(data);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient', activeChat)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Отправка сообщения
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgContent = newMessage.trim();
    setNewMessage('');

    // Если мы пишем в личный чат (есть ключи с '___'), убедимся, что чат создан у обоих в базе
    if (activeChat.includes('___')) {
      const parts = activeChat.split('___');
      const targetUser = parts[0] === username ? parts[1] : parts[0];

      // Проверяем наличие чата у собеседника, если нет — создаем автоматически
      const { data: targetChatCheck } = await supabase
        .from('user_chats')
        .select('*')
        .eq('username', targetUser)
        .eq('room', activeChat);

      if (!targetChatCheck || targetChatCheck.length === 0) {
        await supabase.from('user_chats').insert([
          { username: targetUser, room: activeChat, display_name: username }
        ]);
      }
    }

    const { data, error } = await supabase.from('messages').insert([{ 
      sender: username, 
      recipient: activeChat, 
      content: msgContent 
    }]).select();

    if (!error && data) {
      setMessages((prev) => [...prev, data[0]]);
      scrollToBottom();
    }
  };

  // Кнопка создания личного чата через поиск
  const handleStartPrivateChat = async (targetUser) => {
    if (!targetUser.trim() || targetUser === username) return;
    
    const roomName = getPrivateRoomName(username, targetUser);

    const exists = privateChats.some(c => c.room === roomName);

    if (!exists) {
      await supabase.from('user_chats').insert([
        { username: username, room: roomName, display_name: targetUser },
        { username: targetUser, room: roomName, display_name: username }
      ]);
      
      fetchPrivateChats();
    }
    
    setActiveChat(roomName);
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      
      {/* СЛЕВА: Меню, поиск и чаты */}
      <div className="w-80 bg-[#1e293b] border-r border-slate-700 flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-sky-400 truncate max-w-[180px]">Профиль: {username}</h3>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="text-xs bg-rose-600/20 text-rose-400 px-2.5 py-1 rounded-lg hover:bg-rose-600/40 transition">Выйти</button>
        </div>

        {/* Поиск любого человека */}
        <div className="mb-4">
          <input 
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-sky-500" 
            placeholder="🔍 Введите ник любого чела..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
          {searchQuery && searchQuery.trim() !== username && (
            <button 
              onClick={() => handleStartPrivateChat(searchQuery)}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-xs p-2.5 rounded-xl font-medium transition shadow-lg"
            >
              💬 Написать лично "{searchQuery}"
            </button>
          )}
        </div>
        
        {/* Публичные чаты */}
        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Общие чаты</div>
        <div className="space-y-1 mb-4">
            {publicGroups.map(group => (
                <button 
                  key={group} 
                  onClick={() => setActiveChat(group)} 
                  className={`w-full text-left p-2.5 rounded-xl transition text-sm flex items-center justify-between ${activeChat === group ? 'bg-sky-600 font-bold shadow-lg shadow-sky-600/20' : 'hover:bg-slate-800 text-slate-300'}`}
                >
                  <span># {group}</span>
                </button>
            ))}
        </div>

        {/* Личные сообщения */}
        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Личные сообщения</div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {privateChats.length === 0 ? (
              <div className="text-xs text-slate-500 italic px-1">Нет личных чатов. Найдите кого-то по нику выше!</div>
            ) : (
              privateChats.map(chat => (
                <button 
                  key={chat.room} 
                  onClick={() => setActiveChat(chat.room)} 
                  className={`w-full text-left p-2.5 rounded-xl transition text-sm flex items-center justify-between ${activeChat === chat.room ? 'bg-sky-600 font-bold shadow-lg shadow-sky-600/20' : 'hover:bg-slate-800 text-slate-300'}`}
                >
                  <span>👤 {chat.display_name}</span>
                </button>
              ))
            )}
        </div>
      </div>

      {/* СПРАВА: Переписка */}
      <div className="flex-1 flex flex-col bg-[#0f172a]">
        <div className="p-4 bg-[#1e293b] border-b border-slate-700 font-bold text-base flex items-center shadow-sm">
          💬 {activeChat.includes('___') ? `Личный чат` : `# ${activeChat}`}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 mt-20 text-sm">Здесь пока тихо. Напишите первое сообщение!</div>
            ) : (
              messages.map((m, i) => {
                const isMe = m.sender === username;
                return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[11px] text-slate-400 mb-1 px-1">{m.sender}</span>
                      <div className={`p-3 rounded-2xl text-sm max-w-md ${isMe ? 'bg-sky-600 text-white rounded-br-none' : 'bg-[#1e293b] text-slate-200 rounded-bl-none border border-slate-700'}`}>
                        {m.content}
                      </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-[#1e293b] border-t border-slate-700 flex gap-2">
            <input 
              className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-sky-500 text-white" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder="Введите сообщение..." 
            />
            <button type="submit" className="px-6 bg-sky-500 hover:bg-sky-600 rounded-xl text-sm font-semibold transition">
              Отправить
            </button>
        </form>
      </div>
    </div>
  );
}