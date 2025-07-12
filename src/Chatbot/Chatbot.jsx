

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState('');
  const [promptId, setPromptId] = useState(null);
  const [conversationState, setConversationState] = useState(null);
  const [userData, setUserData] = useState({});
const [subjectCode, setSubjectCode] = useState(null);
  useEffect(() => {
    fetchChatResponse(null);
  }, []);

  const fetchChatResponse = async (promptId, input = null) => {
    try {
      const res = await axios.post('http://localhost:3000/chat/select', { promptId, input });

      console.log('➡️ Response from backend:', res.data);

      if (input) {
        setMessages(prev => [...prev, { type: 'user', text: input }]);
      }

      if (res.data.reply) {
        setMessages(prev => [...prev, { type: 'bot', text: res.data.reply }]);

        // ✅ Detect conversation state triggers
        if (res.data.reply.includes('Registration Number')) {
          setConversationState('registrationNo');
        }

        if (res.data.reply.includes('Enter a program code')) {
          setConversationState('admissionSchedule');
           setSubjectCode(true);
        }
      }

      setOptions(res.data.options || []);

      if (res.data.options?.length > 0) {
        setPromptId(promptId);
      }

    } catch (err) {
      console.error('❌ fetchChatResponse error:', err);
      setMessages(prev => [...prev, { type: 'bot', text: '❌ Server error. Try again later.' }]);
    }
  };

  const handleOptionClick = (option) => {
    setMessages(prev => [...prev, { type: 'user', text: option.promptName }]);
    fetchChatResponse(option.promptId);
    setPromptId(option.promptId);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!input.trim()) return;

  const userInput = input.trim();
  setMessages(prev => [...prev, { type: 'user', text: userInput }]);
  setInput('');

  try {
    // Step 1: Enter registration number
    if (conversationState === 'registrationNo') {
      const res = await axios.post('http://localhost:3000/chat/select', {
        promptId,
        input: userInput,
        registrationNo: userInput
      });

      if (res.data.reply) {
        setMessages(prev => [...prev, { type: 'bot', text: res.data.reply }]);
      }

      if (res.data.expectField === 'mobileNo') {
        setUserData(prev => ({ ...prev, registrationNo: userInput }));
        setConversationState('mobileNo');
      } else if (res.data.expectField === 'complaintText') {
        setUserData(prev => ({ ...prev, registrationNo: userInput }));
        setConversationState('complaintText');
      }

      return;
    }

    // Step 2: Enter mobile number
    if (conversationState === 'mobileNo') {
      const res = await axios.post('http://localhost:3000/chat/select', {
        promptId,
        input: userInput,
        registrationNo: userData.registrationNo,
        mobileNo: userInput
      });

      if (res.data.reply) {
        setMessages(prev => [...prev, { type: 'bot', text: res.data.reply }]);
      }

      if (res.data.expectField === 'otp') {
        setUserData(prev => ({ ...prev, mobileNo: userInput }));
        setConversationState('otp');
      }

      return;
    }

    // Step 3: Enter OTP
    if (conversationState === 'otp') {
      const res = await axios.post('http://localhost:3000/chat/select', {
        promptId,
        input: userInput,
        registrationNo: userData.registrationNo,
        mobileNo: userData.mobileNo,
        otp: userInput
      });

      if (res.data.reply) {
        setMessages(prev => [...prev, { type: 'bot', text: res.data.reply }]);
      }

      if (res.data.expectField === 'complaintText') {
        setConversationState('complaintText');
      } else if (res.data.expectField === 'otp') {
        setConversationState('otp'); // wrong OTP again
      }

      return;
    }

    // Step 4: Enter complaint
    if (conversationState === 'complaintText') {
      const complaintData = {
        registrationNo: userData.registrationNo,
        applicationNo: '',
        complaintText: userInput,
        email: '',
        mobileNo: userData.mobileNo,
        complaintStatus: 'Pending'
      };

      const response = await axios.post('http://localhost:3000/chat/info', complaintData);

      setMessages(prev => [
        ...prev,
        { type: 'bot', text: `✅ Complaint recorded. Ticket No: ${response.data.ticketNo}` }
      ]);

      setConversationState(null);
      setUserData({});
      return;
    }

    // Admission Schedule flow
    if (conversationState === 'admissionSchedule') {
      const res = await axios.post('http://localhost:3000/chat/select', {
        promptId,
        input: userInput,
        subjectCode: true
      });

      if (res.data.reply) {
        setMessages(prev => [...prev, { type: 'bot', text: res.data.reply }]);
      }

      setConversationState(null);
      return;
    }

    // Default fallback
    fetchChatResponse(promptId, userInput);

  } catch (err) {
    console.error('❌ Error in handleSubmit:', err);
    setMessages(prev => [...prev, { type: 'bot', text: '❌ Something went wrong. Try again.' }]);
  }
};



  return (
    <div className="max-w-2xl mx-auto p-4 bg-white shadow-xl rounded-xl">
      <h1 className="text-2xl font-bold mb-4">University Chatbot</h1>

      <div className="space-y-2 h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50 flex flex-col">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg max-w-xs ${
              msg.type === 'bot'
                ? 'bg-blue-100 text-blue-800 self-start'
                : 'bg-green-100 text-green-800 self-end'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {options.map((opt) => (
          <button
            key={opt.promptId}
            onClick={() => handleOptionClick(opt)}
            className="w-full text-left px-4 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-md shadow-sm"
          >
            {opt.promptName}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex">
        <input
          type="text"
          className="flex-grow p-2 border rounded-l-md"
          placeholder="Type your answer here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
