/**
 * Sambal by Kazel - Tailwind CSS Custom Configuration
 * Cloudflare Pages Static E-Commerce Edition
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#7C4A27',
        'primary-dark': '#5E361B',
        'primary-container': '#5E361B',
        'primary-fixed': '#F2E4D5',
        'primary-border': '#D8BEA2',
        secondary: '#93582C',
        'secondary-container': '#7C4A27',
        'secondary-fixed': '#E8D5C4',
        tertiary: '#6B4226',
        'tertiary-container': '#53321B',
        'tertiary-fixed': '#EBDACD',
        background: '#FEF9F3',
        surface: '#FEF9F3',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#F8F3ED',
        'surface-container': '#F2EDE7',
        'surface-container-high': '#ECE7E2',
        'on-surface': '#2D1E14',
        'on-surface-variant': '#5E4A3E',
        outline: '#8C705F',
        'outline-variant': '#D8BEA2'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif']
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.5625rem', { lineHeight: '0.75rem' }]
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem'
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem'
      }
    }
  }
};
