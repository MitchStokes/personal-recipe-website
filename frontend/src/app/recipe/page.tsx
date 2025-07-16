'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = searchParams.get('id');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'YOUR_API_GATEWAY_URL';

  const fetchRecipe = useCallback(async () => {
    if (!recipeId) {
      setRecipe(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/recipes`);
      const recipes = await response.json();
      const foundRecipe = recipes.find((r: Recipe) => r.id === recipeId);
      setRecipe(foundRecipe || null);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, recipeId]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  const handleDelete = async () => {
    if (!recipe) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipe.id}`, {
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
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Delete Recipe
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {recipe.name}
            </h1>
            
            <div className="text-sm text-gray-500 mb-6">
              Created {new Date(recipe.createdAt).toLocaleDateString()}
            </div>

            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {recipe.content}
            </div>
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