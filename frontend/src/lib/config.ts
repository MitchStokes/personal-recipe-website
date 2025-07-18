export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  createRecipePassword: process.env.NEXT_PUBLIC_CREATE_RECIPE_PASSWORD,
} as const;

export function validateConfig() {
  if (!config.apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
  }
  
  if (!config.createRecipePassword) {
    throw new Error('NEXT_PUBLIC_CREATE_RECIPE_PASSWORD environment variable is required for password protection');
  }
}

export function isPasswordProtectionEnabled(): boolean {
  return !!config.createRecipePassword;
}