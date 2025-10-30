/**
 * Text utility functions
 */

/**
 * Capitalizes the first letter of each word in a string
 * @param text - The text to capitalize
 * @returns The text with each word capitalized
 */
export function capitalizeWords(text: string): string {
  if (!text) return text;
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Handles input change with automatic word capitalization
 * @param value - The input value
 * @param onChange - The onChange handler
 */
export function handleCapitalizedInput(
  value: string,
  onChange: (value: string) => void
) {
  const capitalizedValue = capitalizeWords(value);
  onChange(capitalizedValue);
}