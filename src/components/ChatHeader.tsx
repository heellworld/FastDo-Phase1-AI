import React from 'react';
import THEME_CONFIG from '../config/theme.config';

const ChatHeader: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2" style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
      <img 
        src={THEME_CONFIG.assets.logo} 
        alt="FastDo Logo" 
        className="h-7 w-auto"
        style={{ maxWidth: 100 }}
      />
      <span className="font-semibold text-base text-[#0d47a1] tracking-tight ml-2">FastDo Chatbot</span>
    </div>
  );
};

export default ChatHeader; 