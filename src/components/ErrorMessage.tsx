import React from 'react';
import { ErrorType, ErrorResponse } from '../controllers/ChatController';
import THEME_CONFIG from '../config/theme.config';

interface ErrorMessageProps {
  error: ErrorResponse;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
  // Get the appropriate icon and message based on error type
  const getErrorDetails = () => {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return {
          icon: '📡',
          title: 'Lỗi Kết Nối',
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet của bạn.'
        };
      
      case ErrorType.SERVER_ERROR:
        return {
          icon: '🚨',
          title: 'Lỗi Máy Chủ',
          message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
        };
        
      case ErrorType.TIMEOUT_ERROR:
        return {
          icon: '⏱️',
          title: 'Quá Thời Gian',
          message: 'Yêu cầu mất quá nhiều thời gian để hoàn thành. Vui lòng thử lại.'
        };
        
      case ErrorType.AUTH_ERROR:
        return {
          icon: '🔐',
          title: 'Lỗi Xác Thực',
          message: 'Không thể xác thực với máy chủ.'
        };
        
      case ErrorType.RATE_LIMIT_ERROR:
        return {
          icon: '🛑',
          title: 'Giới Hạn Truy Cập',
          message: 'Quá nhiều yêu cầu. Vui lòng đợi một lát trước khi thử lại.'
        };
        
      case ErrorType.VALIDATION_ERROR:
        return {
          icon: '⚠️',
          title: 'Yêu Cầu Không Hợp Lệ',
          message: error.message || 'Dữ liệu yêu cầu không hợp lệ.'
        };
        
      default:
        return {
          icon: '❓',
          title: 'Lỗi Không Xác Định',
          message: error.message || 'Đã xảy ra lỗi không mong muốn.'
        };
    }
  };

  const { icon, title, message } = getErrorDetails();

  return (
    <div className="flex justify-start w-full">
      <div className="flex items-end space-x-2">
        <div className="w-8 h-8 rounded-full bg-[#0d47a1] flex items-center justify-center text-white">
          <span className="text-sm font-bold">F</span>
        </div>
        <div className="bg-[#fff8f6] border border-[#ffcdd2] rounded-lg p-4 shadow-md max-w-[80%] ml-2">
          <div className="flex items-start">
            <div className="text-2xl mr-3 flex-shrink-0">{icon}</div>
            <div>
              <h4 className="font-medium text-[#d32f2f] mb-1">{title}</h4>
              <p className="text-[#e57373] text-sm">{message}</p>
              {error.status && (
                <div className="mt-2 flex items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-[#ffebee] text-[#d32f2f] border border-[#ffcdd2]">
                    Mã lỗi: {error.status}
                  </span>
                </div>
              )}
              <div className="mt-3">
                <button 
                  className="text-xs text-[#0d47a1] hover:underline font-medium"
                  onClick={() => window.location.reload()}
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage; 