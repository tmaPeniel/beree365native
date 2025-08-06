
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
				// 1. Animations d'accordéon (garde les existantes)
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				
				// 2. Entrées douces (Fade-in/Slide révélation)
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(16px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-fade-in': {
					'0%': { opacity: '0', transform: 'scale(0.96)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				
				// 3. Effets de hover (élévation douce)
				'lift': {
					'0%': { transform: 'translateY(0) scale(1)' },
					'100%': { transform: 'translateY(-2px) scale(1.02)' }
				},
				
				// 4. Animations de clic (feedback tactile)
				'press': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.95)' },
					'100%': { transform: 'scale(1)' }
				},
				'ripple': {
					'0%': { transform: 'scale(0)', opacity: '0.6' },
					'100%': { transform: 'scale(1)', opacity: '0' }
				},
				
				// 5. Animations de chargement douces
				'gentle-spin': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' }
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.6' }
				},
				
				// 6. Animations de récompense (badges, success)
				'success-bounce': {
					'0%': { transform: 'scale(0.8)' },
					'50%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)' }
				},
				'badge-glow': {
					'0%, 100%': { boxShadow: '0 0 5px rgba(52, 168, 83, 0.3)' },
					'50%': { boxShadow: '0 0 20px rgba(52, 168, 83, 0.6)' }
				},
				
				// 7. Animation de texte (révélation progressive)
				'text-reveal': {
					'0%': { opacity: '0', transform: 'translateY(4px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				
				// 8. Micro-animation pour icônes
				'icon-bounce': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-2px)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-4px)' }
				},
				
				// 9. Transitions pour formulaires
				'border-glow': {
					'0%': { borderColor: 'hsl(var(--border))' },
					'100%': { borderColor: 'hsl(var(--primary))' }
				},
				'check-mark': {
					'0%': { transform: 'scale(0) rotate(0deg)' },
					'50%': { transform: 'scale(1.2) rotate(180deg)' },
					'100%': { transform: 'scale(1) rotate(360deg)' }
				}
			},
			animation: {
				// Animations de base
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				
				// Entrées douces 
				'fade-in': 'fade-in 0.4s ease-out',
				'slide-up': 'slide-up 0.5s ease-out',
				'scale-fade-in': 'scale-fade-in 0.3s ease-out',
				
				// Effets hover
				'lift': 'lift 0.2s ease-out forwards',
				
				// Animations de clic
				'press': 'press 0.1s ease-out',
				'ripple': 'ripple 0.3s ease-out',
				
				// Chargement doux
				'gentle-spin': 'gentle-spin 1s linear infinite',
				'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
				
				// Récompenses
				'success-bounce': 'success-bounce 0.4s ease-out',
				'badge-glow': 'badge-glow 2s ease-in-out infinite',
				
				// Texte
				'text-reveal': 'text-reveal 0.3s ease-out',
				
				// Icônes
				'icon-bounce': 'icon-bounce 0.5s ease-in-out',
				'float': 'float 3s ease-in-out infinite',
				
				// Formulaires
				'border-glow': 'border-glow 0.2s ease-out',
				'check-mark': 'check-mark 0.4s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
