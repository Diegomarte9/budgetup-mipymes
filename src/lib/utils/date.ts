/**
 * Date utilities to handle timezone issues
 */

/**
 * Converts a date string (YYYY-MM-DD) or Date object to YYYY-MM-DD format for input fields
 * If it's already a YYYY-MM-DD string, returns it as-is
 */
export function formatDateForInput(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's already in YYYY-MM-DD format, return as-is
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    // If it's an ISO string, extract just the date part
    return date.split('T')[0];
  }
  
  // Convert Date object to YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date in YYYY-MM-DD format for input fields
 */
export function getTodayForInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD) for display in the Dominican Republic locale
 * Avoids timezone conversion by parsing the date components directly
 */
export function formatDateForDisplay(dateString: string): string {
  // If it's already in YYYY-MM-DD format, parse it directly
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  // If it's an ISO string, extract the date part first
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Simply returns the date string as-is for API calls
 * No conversion needed since we're working with YYYY-MM-DD format
 */
export function dateInputToISO(dateString: string): string {
  return dateString;
}