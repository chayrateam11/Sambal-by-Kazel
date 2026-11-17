/**
 * Sambal by Kazel - Tailwind CSS Custom Configuration
 * Cloudflare Pages Static E-Commerce Edition
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#b70011',
        'primary-container': '#dc2626',
        'primary-fixed': '#ffdad6',
        secondary: '#a73a00',
        'secondary-container': '#fd651e',
        'secondary-fixed': '#ffdbce',
        tertiary: '#7f4f00',
        'tertiary-container': '#a06500',
        'tertiary-fixed': '#ffddb8',
        background: '#fef9f3',
        surface: '#fef9f3',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f8f3ed',
        'surface-container': '#f2ede7',
        'surface-container-high': '#ece7e2',
        'on-surface': '#1d1b18',
        'on-surface-variant': '#5c403c',
        outline: '#916f6b',
        'outline-variant': '#e6bdb8'
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
