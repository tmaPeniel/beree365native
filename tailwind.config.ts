
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				beree: {
					50: '#f0faf3',
					100: '#dcf2e3',
					200: '#bde5cb',
					300: '#92d2aa',
					400: '#65b881',
					500: '#34A853', // Our accent green
					600: '#2e8a45',
					700: '#29703b',
					800: '#255a32',
					900: '#214a2c',
					950: '#0e2716',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(20px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'slide-down': {
					'0%': {
						transform: 'translateY(-10px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'bounce-gentle': {
					'0%, 100%': {
						transform: 'translateY(0)',
						opacity: '1'
					},
					'50%': {
						transform: 'translateY(-5px)',
						opacity: '0.8'
					}
				},
				'pulse-gentle': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '1'
					},
					'50%': {
						transform: 'scale(1.02)',
						opacity: '0.9'
					}
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(-1deg)' },
					'75%': { transform: 'rotate(1deg)' }
				},
				'heart-beat': {
					'0%': { transform: 'scale(1)' },
					'14%': { transform: 'scale(1.1)' },
					'28%': { transform: 'scale(1)' },
					'42%': { transform: 'scale(1.1)' },
					'70%': { transform: 'scale(1)' }
				},
				'confetti-pop': {
					'0%': { 
						transform: 'scale(0) rotate(0deg) translateY(0px)',
						opacity: '1'
					},
					'25%': {
						transform: 'scale(1.5) rotate(90deg) translateY(-20px)',
						opacity: '1'
					},
					'50%': { 
						transform: 'scale(1.2) rotate(180deg) translateY(-40px)',
						opacity: '0.9'
					},
					'75%': {
						transform: 'scale(0.9) rotate(270deg) translateY(-60px)',
						opacity: '0.6'
					},
					'100%': { 
						transform: 'scale(0.3) rotate(360deg) translateY(-80px)',
						opacity: '0'
					}
				},
				'firework': {
					'0%': { 
						transform: 'scale(0)',
						opacity: '1'
					},
					'20%': { 
						transform: 'scale(1)',
						opacity: '1'
					},
					'100%': { 
						transform: 'scale(2)',
						opacity: '0'
					}
				},
				'sparkle': {
					'0%, 100%': { 
						transform: 'scale(0) rotate(0deg)',
						opacity: '0'
					},
					'50%': { 
						transform: 'scale(1) rotate(180deg)',
						opacity: '1'
					}
				},
				'completion-burst': {
					'0%': { 
						transform: 'scale(1)',
						boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)'
					},
					'70%': { 
						transform: 'scale(1.05)',
						boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)'
					},
					'100%': { 
						transform: 'scale(1)',
						boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)'
					}
				},
				'progress-fill': {
					'0%': { 
						strokeDashoffset: '100%'
					},
					'100%': { 
						strokeDashoffset: '0%'
					}
				},
				'badge-unlock': {
					'0%': { 
						transform: 'scale(0) rotate(-180deg)',
						opacity: '0'
					},
					'50%': { 
						transform: 'scale(1.3) rotate(0deg)',
						opacity: '1'
					},
					'100%': { 
						transform: 'scale(1) rotate(0deg)',
						opacity: '1'
					}
				},
				'tada': {
					'0%': { transform: 'scale3d(1, 1, 1)' },
					'10%, 20%': { transform: 'scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)' },
					'30%, 50%, 70%, 90%': { transform: 'scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)' },
					'40%, 60%, 80%': { transform: 'scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)' },
					'100%': { transform: 'scale3d(1, 1, 1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'slide-down': 'slide-down 0.3s ease-out',
				'bounce-gentle': 'bounce-gentle 1s ease-in-out',
				'pulse-gentle': 'pulse-gentle 2s ease-in-out infinite',
				'wiggle': 'wiggle 0.5s ease-in-out',
				'heart-beat': 'heart-beat 1.5s ease-in-out infinite',
				'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
				'confetti-pop': 'confetti-pop 1.2s ease-out',
				'firework': 'firework 0.8s ease-out',
				'sparkle': 'sparkle 1.5s ease-in-out infinite',
				'completion-burst': 'completion-burst 0.8s ease-out',
				'progress-fill': 'progress-fill 2s ease-out',
				'badge-unlock': 'badge-unlock 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'tada': 'tada 1s ease-in-out',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
