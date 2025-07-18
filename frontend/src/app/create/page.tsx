'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateRecipe() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'YOUR_API_GATEWAY_URL';
  const REQUIRED_PASSWORD = process.env.NEXT_PUBLIC_CREATE_RECIPE_PASSWORD || 'recipemaster123';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !content.trim()) {
      alert('Please fill in both recipe name and content.');
      return;
    }

    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (password !== REQUIRED_PASSWORD) {
      alert('Incorrect password. Recipe creation denied.');
      setPassword('');
      return;
    }

    setShowPasswordModal(false);
    setPassword('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          content: content.trim(),
        }),
      });

      if (response.ok) {
        router.push('/');
      } else {
        const error = await response.json();
        alert(`Error creating recipe: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating recipe:', error);
      alert('Error creating recipe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Create Recipe</h1>
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Back to Recipes
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter recipe name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your recipe here... Include ingredients, instructions, cooking time, etc."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical text-gray-900"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !content.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Recipe'}
                </button>
                <Link 
                  href="/"
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enter Password</h2>
            <p className="text-gray-600 mb-4">Please enter the password to create this recipe:</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={handlePasswordCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}