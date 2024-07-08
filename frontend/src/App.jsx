import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId] = useState(Math.random().toString(36).substring(7));
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:3000/chat', {
        message: input,
        userId: userId
      });

      setIsTyping(false);
      const botMessage = { text: response.data.response, isUser: false };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <i className="fas fa-robot"></i>
        <h1>Bot9 Palace Assistant</h1>
      </div>
      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message-bubble ${message.isUser ? 'user' : 'bot'}`}>
              {message.isUser ? (
                message.text
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="message-bubble bot typing">
              Typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="input-container">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button className="send-button" onClick={sendMessage}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
}

export default App;