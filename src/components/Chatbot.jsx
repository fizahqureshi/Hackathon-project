import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaComments, FaTimes, FaChevronDown } from 'react-icons/fa';
import '../styles/chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('popmaster_chat_messages');
      return saved ? JSON.parse(saved) : [
        {
          id: 1,
          text: 'Hi Player! 👋 I can give tips, explain rules, and help with the leaderboard. What would you like to know?',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        },
      ];
    } catch (e) {
      return [
        {
          id: 1,
          text: 'Hi Player! 👋 I can give tips, explain rules, and help with the leaderboard. What would you like to know?',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        },
      ];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('popmaster_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const suggestedQuestions = [
    'How do I play?',
    'How is score calculated?',
    'How do I get power-ups?',
    'How does leaderboard work?',
  ];

  const getAIResponse = (text) => {
    const message = text.toLowerCase();

    // Game-specific rule-based responses
    if (message.includes('how') && message.includes('play')) {
      return 'Pop the target-coloured balloons only. You have 3 chances per level. React fast to score more points!';
    }

    if (message.includes('score') || message.includes('points')) {
      return 'Points are awarded for correct pops and combo streaks. Faster pops and accuracy give bonus points.';
    }

    if (message.includes('power') || message.includes('power-up') || message.includes('boost')) {
      return 'Power-ups spawn occasionally — tap them to activate. They can slow time, increase score multipliers, or give extra chances.';
    }

    if (message.includes('leader') || message.includes('rank') || message.includes('leaderboard')) {
      return 'Leaderboard shows top scores saved to the cloud. Make sure you are signed in so your best score is recorded!';
    }

    if (message.includes('controls') || message.includes('touch') || message.includes('click')) {
      return 'Tap or click balloons to pop them. On keyboard you can also press the arrow keys + space (if enabled in Settings).';
    }

    if (message.includes('save') || message.includes('local') || message.includes('progress')) {
      return 'Your score & level are saved automatically. Sign in to sync across devices.';
    }

    if (message.includes('tips') || message.includes('trick') || message.includes('strategy')) {
      return 'Aim for accuracy first — keep combos alive. Use power-ups strategically on tough levels.';
    }

    if (message.includes('help') || message.includes('issue') || message.includes('bug')) {
      return 'If you encounter a bug, take a screenshot and report it from the Settings > Feedback screen. Include device and steps to reproduce.';
    }

    // Short friendly default
    return "Nice question — try asking about 'how to play', 'score', 'power-ups' or 'leaderboard'.";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();

    const userMsg = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate thinking / no external API
    setTimeout(() => {
      const botText = getAIResponse(text);
      const botMsg = {
        id: Date.now() + 1,
        text: botText,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages((p) => [...p, botMsg]);
      setLoading(false);
    }, 500 + Math.random() * 700);
  };

  const handleSuggested = (q) => {
    setInput(q);
    // immediately send
    setTimeout(() => handleSend(), 50);
  };

  return (
    <div className="chatbot-wrapper">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-window"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="chatbot-header">
              <div className="chatbot-title">
                <FaComments /> <span>Pop Master Assistant</span>
              </div>
              <button className="chatbot-close" onClick={() => setIsOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="chatbot-messages">
              {messages.map((m, i) => (
                <div key={m.id} className={`chat-msg ${m.sender}`}>
                  <div className="chat-bubble">{m.text}</div>
                </div>
              ))}

              {loading && (
                <div className="chat-msg bot">
                  <div className="chat-bubble typing">
                    <span /> <span /> <span />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 3 && !loading && (
              <div className="suggested">
                {suggestedQuestions.map((q, idx) => (
                  <button key={idx} onClick={() => handleSuggested(q)} className="suggested-btn">
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="chat-input-area">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about the game, scores, or tips..."
              />
              <button onClick={handleSend} className="send-btn" disabled={!input.trim() || loading}>
                <FaPaperPlane />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button className="chatbot-fab" onClick={() => setIsOpen((s) => !s)}>
        {isOpen ? <FaChevronDown /> : <FaComments />}
      </button>
    </div>
  );
};

export default Chatbot;
