'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { config } from '@/lib/config';

interface Recipe {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);


  const fetchRecipes = useCallback(async () => {
    try {
      const url = searchQuery 
        ? `${config.apiBaseUrl}/recipes?search=${encodeURIComponent(searchQuery)}`
        : `${config.apiBaseUrl}/recipes`;
      
      const response = await fetch(url);
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900">My Recipes</h1>
            <Link 
              href="/create" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add Recipe
            </Link>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading recipes...</div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600 mb-4">
                {searchQuery ? 'No recipes found matching your search.' : 'No recipes yet.'}
              </div>
              <Link 
                href="/create" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create a recipe
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipe?id=${recipe.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer block"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    {recipe.name}
                  </h2>
                  <div className="text-gray-700 whitespace-pre-wrap mb-4">
                    {recipe.content.length > 200 
                      ? `${recipe.content.substring(0, 200)}...` 
                      : recipe.content}
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {new Date(recipe.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}