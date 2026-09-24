/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                government: {
                    blue: '#1a365d',
                    dark: '#102a43',
                    light: '#ebf8ff',
                },
                priority: {
                    low: '#2f855a',
                    medium: '#ecc94b',
                    high: '#ed8936',
                    critical: '#c53030',
                }
            }
        },
    },
    plugins: [],
}
