import React from 'react';
import THEME_CONFIG from '../config/theme.config';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="flex items-end space-x-2">
        <div className="w-8 h-8 rounded-full bg-[#0d47a1] flex items-center justify-center text-white">
          <span className="text-sm font-bold">F</span>
        </div>
        <div className="bg-[#f7f9fc] border border-[#e0e6ed] rounded-lg p-3 shadow-md max-w-[80%] ml-2">
          <div className="flex space-x-2">
            <div className="w-2.5 h-2.5 bg-[#0d47a1] rounded-full animate-bounce" />
            <div className="w-2.5 h-2.5 bg-[#0d47a1] rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-2.5 h-2.5 bg-[#0d47a1] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator; 