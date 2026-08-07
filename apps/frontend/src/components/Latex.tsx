import { useEffect, useRef, useState } from 'react';

export default function Latex({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [katexLoaded, setKatexLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkKatex = () => {
      if ((window as any).renderMathInElement) {
        setKatexLoaded(true);
        return true;
      }
      return false;
    };

    if (checkKatex()) return;

    // Check if script tags are already in DOM
    const hasCss = !!document.getElementById('katex-css');
    const hasJs = !!document.getElementById('katex-js');

    if (!hasCss) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }

    if (!hasJs) {
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
    } else {
      // Script tags are present but KaTeX isn't loaded on window yet, poll for it
      const interval = setInterval(() => {
        if (checkKatex()) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
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
