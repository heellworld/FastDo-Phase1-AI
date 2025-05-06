import React, { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatMessage, { MessageProps } from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import ChatHeader from "./components/ChatHeader";
import { sendMessage, getErrorDetails } from "./services/api";
import { getOrCreateSessionId } from "./utils/sessionUtils";
import { ErrorType, ErrorResponse } from "./controllers/ChatController";
import THEME_CONFIG from "./config/theme.config";

// Remove the id from MessageProps since we're using it differently
type Message = Omit<MessageProps, 'id'> & { id: string };

// Define a union type for message content
type MessageContent = 
  | { type: "text"; content: string; image?: string }
  | { type: "error"; error: ErrorResponse };

// Extended message type with content
interface ExtendedMessage extends Omit<Message, "text" | "image"> {
  content: MessageContent;
}

function App() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  useEffect(() => {
    // Initialize or retrieve session ID
    setSessionId(getOrCreateSessionId());
    
    // Chỉ thêm tin nhắn chào mừng nếu chưa từng thêm
    if (!didInit.current) {
      setMessages((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: uuidv4(),
              type: "bot",
              content: {
                type: "text",
                content: "Xin chào! Tôi là trợ lý ảo của Fastdo. Tôi có thể giúp gì cho bạn hôm nay?",
              },
            },
          ];
        }
        return prev;
      });
      didInit.current = true;
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (message: Omit<ExtendedMessage, "id">) => {
    const newMessage = { ...message, id: uuidv4() };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addMessage({ 
      type: "user", 
      content: { type: "text", content: text } 
    });
    
    setIsLoading(true);

    try {
      const data = await sendMessage(text.trim(), sessionId);
      
      // Add bot response
      addMessage({
        type: "bot",
        content: { 
          type: "text", 
          content: data.text || "Xin lỗi, tôi không có câu trả lời cho yêu cầu này.",
          image: data.image
        }
      });
    } catch (error: any) {
      console.error("Error processing request:", error);
      
      // Check if this is a known error type
      const errorDetails = getErrorDetails(error) || {
        type: ErrorType.UNKNOWN_ERROR,
        message: error.message || "Đã xảy ra lỗi không mong muốn."
      };
      
      // Add error message
      addMessage({
        type: "bot",
        content: { type: "error", error: errorDetails }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-0 md:p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e3eafc 100%)' }}>
      <div 
        className="w-full max-w-3xl h-[95vh] md:h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col mx-0 md:mx-auto" 
      >
        <ChatHeader />
        
        <div className="flex-1 overflow-y-auto px-0 md:px-12 py-8 space-y-8 bg-[#f8fafc]">
          {messages.map((message) => {
            if (message.content.type === "error") {
              return (
                <ErrorMessage 
                  key={message.id}
                  error={message.content.error}
                />
              );
            } else {
              return (
                <ChatMessage
                  key={message.id}
                  id={message.id}
                  type={message.type}
                  text={message.content.content}
                  image={message.content.image}
                />
              );
            }
          })}
          {isLoading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default App;
