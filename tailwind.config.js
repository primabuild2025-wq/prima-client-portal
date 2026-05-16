/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Light theme color palette
        'bg-page': '#F5F6FA',        // Page background
        'bg-card': '#FFFFFF',         // Cards/panels
        'bg-header': '#11144C',       // Header/Sidebar background
        'text-primary': '#0a0a0a',    // Primary text
        'text-secondary': '#6b7280',  // Secondary text
        'border': '#e5e7eb',          // Borders
        'accent': '#11144C',          // Buttons/accents
        'accent-text': '#FFFFFF',     // Text on accent backgrounds
        
        // Status colors (adjusted for light background)
        'status-success': '#059669',  // Green
        'status-info': '#0284c7',     // Blue
        'status-warning': '#d97706',  // Amber
        'status-error': '#dc2626',    // Red
        
        // Legacy color names for backward compatibility
        primary: '#11144C',
        surface: '#FFFFFF',
        background: '#F5F6FA',
        text: '#0a0a0a'
      }
    }
  },
  plugins: []
};
