import React from 'react';
import ReactMarkdown from 'react-markdown';
import THEME_CONFIG from '../config/theme.config';

export interface MessageProps {
  id: string;
  type: 'user' | 'bot';
  text: string;
  image?: string;
}

const ChatMessage: React.FC<MessageProps> = ({ type, text, image }) => {
  const { borderRadius, shadows } = THEME_CONFIG;
  const isUser = type === 'user';
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2`}>
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-[#0d47a1] flex items-center justify-center text-white text-base font-bold shadow">F</div>
        </div>
      )}
      <div
        className={`flex-1 max-w-2xl px-6 py-4 rounded-2xl text-lg shadow ${
          isUser
            ? 'bg-[#e3eafc] text-[#0d47a1] rounded-br-md border border-[#b6c6e3]'
            : 'bg-white text-[#263238] border border-[#e0e6ed] rounded-bl-md'
        }`}
        style={{
          borderRadius: borderRadius.large,
          boxShadow: shadows.small,
          lineHeight: 1.8,
        }}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap leading-relaxed font-medium">{text}</span>
        ) : (
          <div className="prose prose-lg max-w-none prose-headings:text-[#0d47a1] prose-a:text-[#ff6d00] prose-a:font-medium">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
        {image && (
          <img
            src={image}
            alt="Response"
            className="mt-3 rounded-lg max-w-full h-auto border border-[#e0e6ed]"
            style={{ borderRadius: borderRadius.medium }}
          />
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-[#ff6d00] flex items-center justify-center text-white text-base font-semibold shadow">You</div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 