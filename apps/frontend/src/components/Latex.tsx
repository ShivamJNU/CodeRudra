import { useEffect, useRef, useState } from 'react';

export default function Latex({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [katexLoaded, setKatexLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if KaTeX auto-render is already loaded globally
    if ((window as any).renderMathInElement) {
      setKatexLoaded(true);
      return;
    }

    // Avoid double injecting link
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }

    // Avoid double injecting script
    if (!document.getElementById('katex-js')) {
      const script = document.createElement('script');
      script.id = 'katex-js';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
      script.async = true;
      script.onload = () => {
        const autoRenderScript = document.createElement('script');
        autoRenderScript.id = 'katex-auto-render-js';
        autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
        autoRenderScript.async = true;
        autoRenderScript.onload = () => {
          setKatexLoaded(true);
        };
        document.head.appendChild(autoRenderScript);
      };
      document.head.appendChild(script);
    } else if ((window as any).katex) {
      // Script is already in DOM, check auto render loading
      const checkInterval = setInterval(() => {
        if ((window as any).renderMathInElement) {
          setKatexLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  useEffect(() => {
    if (katexLoaded && containerRef.current && (window as any).renderMathInElement) {
      try {
        (window as any).renderMathInElement(containerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
      }
    }
  }, [text, katexLoaded]);

  const renderedText = text || '';

  return (
    <div ref={containerRef} className={className} style={{ wordBreak: 'break-word' }}>
      {renderedText.split('\n').map((para, i) => (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          {para}
        </p>
      ))}
    </div>
  );
}
