/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "surface-container-highest": "#d3e4fe",
        "on-primary-container": "#a8b8ff",
        "on-surface": "#0b1c30",
        "on-primary-fixed": "#001453",
        "tertiary-container": "#872d00",
        "on-tertiary": "#ffffff",
        "tertiary-fixed": "#ffdbce",
        "inverse-primary": "#b8c4ff",
        "surface": "#f8f9ff",
        "secondary": "#5d5f5f",
        "error-container": "#ffdad6",
        "background": "#f8f9ff",
        "inverse-surface": "#213145",
        "tertiary-fixed-dim": "#ffb59a",
        "on-surface-variant": "#444653",
        "outline-variant": "#c4c5d5",
        "on-background": "#0b1c30",
        "surface-container-low": "#eff4ff",
        "surface-bright": "#f8f9ff",
        "primary": "#00288e",
        "surface-container-lowest": "#ffffff",
        "secondary-fixed-dim": "#c6c6c7",
        "error": "#ba1a1a",
        "secondary-container": "#dfe0e0",
        "on-error": "#ffffff",
        "on-secondary-fixed-variant": "#454747",
        "on-secondary-container": "#616363",
        "outline": "#757684",
        "surface-container-high": "#dce9ff",
        "on-error-container": "#93000a",
        "on-primary": "#ffffff",
        "primary-fixed-dim": "#b8c4ff",
        "on-primary-fixed-variant": "#173bab",
        "inverse-on-surface": "#eaf1ff",
        "on-tertiary-fixed-variant": "#802a00",
        "primary-container": "#1e40af",
        "on-tertiary-container": "#ffa583",
        "surface-variant": "#d3e4fe",
        "surface-container": "#e5eeff",
        "surface-tint": "#3755c3",
        "on-secondary-fixed": "#1a1c1c",
        "on-secondary": "#ffffff",
        "surface-dim": "#cbdbf5",
        "tertiary": "#611e00",
        "primary-fixed": "#dde1ff",
        "on-tertiary-fixed": "#380d00",
        "secondary-fixed": "#e2e2e2"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "stack-sm": "8px",
        "stack-md": "16px",
        "sidebar-width": "280px",
        "stack-lg": "32px",
        "gutter": "16px",
        "unit": "4px",
        "container-padding": "24px"
      },
      "fontFamily": {
        "headline-md": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "doc-preview": ["\"Source Serif 4\"", "serif"]
      },
      "fontSize": {
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "doc-preview": ["16px", { "lineHeight": "1.5", "fontWeight": "400" }]
      },
      "boxShadow": {
        'level-1': '0 2px 4px rgba(0,0,0,0.05)',
        'level-2': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    }
  },
  plugins: [],
}
