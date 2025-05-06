import React, { useState } from 'react';
import { Send } from 'lucide-react';
import THEME_CONFIG from '../config/theme.config';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    onSendMessage(input);
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-100 px-6 py-5 bg-white shadow-lg"
    >
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0d47a1] focus:border-[#0d47a1] text-lg shadow-sm bg-[#f7f9fc] font-medium"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-4 bg-[#ff6d00] text-white rounded-2xl hover:bg-[#ff8124] focus:outline-none focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-colors duration-200 flex items-center justify-center"
        >
          <Send className="w-6 h-6" />
        </button>
      </div>
      <div className="flex justify-center mt-1">
        <p className="text-xs text-gray-400">Powered by <span className="text-[#0d47a1] font-medium">Fastdo</span></p>
      </div>
    </form>
  );
};

export default ChatInput; 