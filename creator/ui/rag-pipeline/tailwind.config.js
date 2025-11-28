import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			// Apple Human Interface Guidelines inspired colors
			colors: {
				primary: {
					DEFAULT: '#007AFF',
					dark: '#0051D5',
					light: '#5AC8FA',
				},
				secondary: {
					DEFAULT: '#5856D6',
					dark: '#3634A3',
					light: '#AF52DE',
				},
			},
			fontFamily: {
				sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
} satisfies Config;
