import { useEffect, useState } from 'react';

// Function to load KaTeX core stylesheet and script dynamically
function useKatex() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if KaTeX is already loaded globally
    if ((window as any).katex) {
      setLoaded(true);
      return;
    }

    // Avoid double injecting stylesheet
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
        setLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      // Script tags are present but KaTeX isn't loaded on window yet, poll for it
      const interval = setInterval(() => {
        if ((window as any).katex) {
          setLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return loaded;
}

// Custom parser to map TeX math tokens to KaTeX HTML strings
function parseLatex(text: string, katex: any): string {
  if (!katex) return text;

  // 1. Split by block math $$
  const blockParts = text.split('$$');
  const renderedBlocks = blockParts.map((block, index) => {
    const isBlockMath = index % 2 === 1;
    if (isBlockMath) {
      try {
        return katex.renderToString(block, { displayMode: true, throwOnError: false });
      } catch (err) {
        return `$$${block}$$`;
      }
    } else {
      // 2. Split by inline math $
      const inlineParts = block.split('$');
      return inlineParts.map((inline, idx) => {
        const isInlineMath = idx % 2 === 1;
        if (isInlineMath) {
          try {
            return katex.renderToString(inline, { displayMode: false, throwOnError: false });
          } catch (err) {
            return `$${inline}$`;
          }
        } else {
          return inline;
        }
      }).join('');
    }
  });

  return renderedBlocks.join('');
}

export default function Latex({ text, className = '' }: { text: string; className?: string }) {
  const loaded = useKatex();
  const katex = typeof window !== 'undefined' ? (window as any).katex : null;

  const renderedText = text || '';

  // Fallback to pre-wrap standard text while KaTeX is downloading
  if (!loaded || !katex) {
    return (
      <div className={className} style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
        {renderedText}
      </div>
    );
  }

  // Parse paragraphs and insert LaTeX HTML
  const paragraphs = renderedText.split('\n');

  return (
    <div className={className} style={{ wordBreak: 'break-word' }}>
      {paragraphs.map((para, i) => {
        const html = parseLatex(para, katex);
        return (
          <p
            key={i}
            className={i > 0 ? 'mt-2' : ''}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}
