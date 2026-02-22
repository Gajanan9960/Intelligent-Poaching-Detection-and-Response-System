/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                forest: {
                    50: '#f2f8f5',
                    100: '#e0efe6',
                    200: '#c2dfce',
                    300: '#95c6ab',
                    400: '#62a683',
                    500: '#408966',
                    600: '#2f6d50',
                    700: '#275842',
                    800: '#214636',
                    900: '#1c3a2e',
                    950: '#0f201a',
                },
                alert: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    500: '#f43f5e',
                    600: '#e11d48',
                    900: '#881337',
                }
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
            }
        },
    },
    plugins: [],
}
