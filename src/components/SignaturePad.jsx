import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

export default function SignaturePad({ onSave, onClear, initialValue }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Initialize and handle canvas resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Get container dimensions
      const rect = containerRef.current.getBoundingClientRect();
      
      // Store current drawing if any
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);

      // Set canvas size matching the CSS styling size
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Re-fill background to white (so it saves with white bg, not transparent)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set drawing styles
      ctx.strokeStyle = '#0f172a'; // Deep slate blue for high-contrast ink
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Restore drawing if it existed
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    };

    // Delay slightly to ensure layout is complete
    const timeoutId = setTimeout(resizeCanvas, 50);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Set initial signature if provided (e.g. from state)
  useEffect(() => {
    if (initialValue && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSigned(true);
      };
      img.src = initialValue;
    }
  }, [initialValue]);

  // Drawing event handlers
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getEventPos(e);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getEventPos(e);
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSignatureData();
    }
  };

  // Helper to get coordinates relative to canvas
  const getEventPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onClear();
  };

  const saveSignatureData = () => {
    if (!hasSigned) return;
    const canvas = canvasRef.current;
    // Export canvas as PNG base64
    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="form-group signature-section">
      <div className="signature-header">
        <label className="label-required">Digital Signature</label>
        {hasSigned && (
          <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Check size={14} /> Signature Captured
          </span>
        )}
      </div>
      
      <div ref={containerRef} className="signature-canvas-container">
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="signature-actions">
        <button
          type="button"
          onClick={clearCanvas}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Trash2 size={16} /> Clear Signature
        </button>
      </div>
    </div>
  );
}
