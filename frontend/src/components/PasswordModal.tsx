'use client';

import { useState } from 'react';
import { config } from '@/lib/config';

interface PasswordModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export function PasswordModal({ 
  isOpen, 
  onCancel, 
  onSuccess, 
  title = "Enter Password",
  message = "Please enter the password to continue:"
}: PasswordModalProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (password === config.createRecipePassword) {
      setPassword('');
      onSuccess();
    } else {
      alert('Incorrect password.');
      setPassword('');
    }
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}