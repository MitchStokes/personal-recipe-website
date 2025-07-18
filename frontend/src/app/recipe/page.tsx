'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { config, isPasswordProtectionEnabled } from '@/lib/config';
import { PasswordModal } from '@/components/PasswordModal';

interface Recipe {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

function RecipeContent() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'edit' | 'delete'>('edit');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = searchParams.get('id');

  const fetchRecipe = useCallback(async () => {
    if (!recipeId) {
      setRecipe(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/recipes`);
      const recipes = await response.json();
      const foundRecipe = recipes.find((r: Recipe) => r.id === recipeId);
      setRecipe(foundRecipe || null);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  const handleDeleteClick = () => {
    if (isPasswordProtectionEnabled()) {
      setPasswordAction('delete');
      setShowPasswordModal(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/recipes/${recipe.id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        router.push('/');
      } else {
        console.error('Failed to delete recipe');
        alert('Failed to delete recipe. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    if (recipe) {
      setEditName(recipe.name);
      setEditContent(recipe.content);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName('');
    setEditContent('');
  };

  const handleSaveClick = () => {
    if (!editName.trim() || !editContent.trim()) {
      alert('Please fill in both recipe name and content.');
      return;
    }
    
    if (isPasswordProtectionEnabled()) {
      setPasswordAction('edit');
      setShowPasswordModal(true);
    } else {
      saveRecipe();
    }
  };

  const saveRecipe = async () => {
    setSaving(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: recipeId,
          name: editName.trim(),
          content: editContent.trim(),
        }),
      });

      if (response.ok) {
        const updatedRecipe = await response.json();
        setRecipe(updatedRecipe);
        setIsEditing(false);
        setEditName('');
        setEditContent('');
      } else {
        const error = await response.json();
        alert(`Error updating recipe: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Error updating recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    if (passwordAction === 'edit') {
      saveRecipe();
    } else if (passwordAction === 'delete') {
      setShowDeleteConfirm(true);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8">
              <div className="text-gray-600">Loading recipe...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipeId || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8">
              <div className="text-gray-600 mb-4">Recipe not found.</div>
              <Link 
                href="/" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Back to recipes
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              ← Back to recipes
            </Link>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveClick}
                    disabled={saving || !editName.trim() || !editContent.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Edit Recipe
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Delete Recipe
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Name
                  </label>
                  <input
                    type="text"
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter recipe name..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label htmlFor="editContent" className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Content
                  </label>
                  <textarea
                    id="editContent"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Enter your recipe here... Include ingredients, instructions, cooking time, etc."
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical text-gray-900"
                    disabled={saving}
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {recipe.name}
                </h1>
                
                <div className="text-sm text-gray-500 mb-6">
                  Created {new Date(recipe.createdAt).toLocaleDateString()}
                </div>

                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {recipe.content}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Recipe
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{recipe.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        isOpen={showPasswordModal}
        onCancel={handlePasswordCancel}
        onSuccess={handlePasswordSuccess}
        title="Enter Password"
        message={passwordAction === 'edit' 
          ? "Please enter the password to save changes to this recipe:" 
          : "Please enter the password to delete this recipe:"}
      />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="text-gray-600">Loading recipe...</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipeDetail() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RecipeContent />
    </Suspense>
  );
}