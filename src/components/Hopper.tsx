'use client'

import { useState } from 'react';

interface HopperProps {
  onExtract: (formData: FormData) => Promise<void>;
  isExtracting: boolean;
}

export default function Hopper({ onExtract, isExtracting }: HopperProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    onExtract(formData);
  };

  return (
    <section className="card">
      <h2 style={{ marginBottom: '12px', fontFamily: 'Source Serif 4, serif' }}>1. Add Citations</h2>
      <p style={{ color: 'var(--stone)', marginBottom: '24px' }}>
        Upload a Word Document (.docx) or PDF (.pdf) to extract citations and begin the audit process.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
        <div style={{
          border: '2px dashed var(--clay)',
          padding: '40px 20px',
          borderRadius: '8px',
          textAlign: 'center',
          backgroundColor: 'var(--cream)',
          position: 'relative'
        }}>
          <input 
            type="file" 
            accept=".docx,.pdf" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              opacity: 0, 
              cursor: 'pointer' 
            }}
          />
          <p style={{ fontWeight: 500, color: 'var(--ink)' }}>
            Drag and drop your file here, or click to browse
          </p>
          {file && (
            <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#E8F8F0', color: 'var(--sage)', borderRadius: '4px', fontWeight: 500 }}>
              Selected: {file.name}
            </div>
          )}
        </div>
        
        <button type="button" onClick={async () => {
          const res = await fetch('/test.docx');
          const blob = await res.blob();
          setFile(new File([blob], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        }} className="secondary-button" style={{ alignSelf: 'flex-start', border: '1px solid var(--clay)', padding: '8px 16px', borderRadius: '4px', background: 'var(--sand)' }}>
          Load Test Document
        </button>

        <button type="submit" disabled={!file || isExtracting} style={{ alignSelf: 'flex-start' }}>
          {isExtracting ? 'Extracting...' : 'Extract Citations'}
        </button>
      </form>
    </section>
  );
}
