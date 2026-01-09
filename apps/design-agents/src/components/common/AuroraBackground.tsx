import { Global, css } from '@emotion/react';
import { useThemeContext } from './ThemeContext';

export const AuroraBackground = () => {
  const { mode } = useThemeContext();
  const isDark = mode === 'dark';

  // Colors
  const bg = isDark ? '#0f172a' : '#f8fafc';
  
  // Aurora blobs (Purple, Blue, Cyan) - adjusted for Light/Dark
  const c1 = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.2)'; // Sky
  const c2 = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.2)'; // Violet
  const c3 = isDark ? 'rgba(45, 212, 191, 0.15)' : 'rgba(45, 212, 191, 0.2)'; // Teal

  return (
    <Global
      styles={css`
        body {
          background-color: ${bg};
          background-image: 
            radial-gradient(at 0% 0%, ${c1} 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${c2} 0px, transparent 50%),
            radial-gradient(at 100% 100%, ${c3} 0px, transparent 50%),
            radial-gradient(at 0% 100%, ${c1} 0px, transparent 50%);
          background-attachment: fixed;
          transition: background 0.5s ease;
        }

        /* Subtle noise texture overlay */
        body::before {
          content: "";
          position: fixed;
          top: 0; 
          left: 0;
          width: 100%; 
          height: 100%;
          pointer-events: none;
          z-index: -1;
          opacity: ${isDark ? 0.03 : 0.05};
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}
    />
  );
};
