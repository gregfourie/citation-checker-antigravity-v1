'use client'

import { useState } from 'react';
import { parseDocument, ProcessedCitation } from './actions';
import Hopper from '@/components/Hopper';
import Auditor from '@/components/Auditor';
import Certificate from '@/components/Certificate';
import ScalesAnimation from '@/components/ScalesAnimation';

export default function Home() {
  const [activeTab, setActiveTab] = useState(1);
  const [extractedText, setExtractedText] = useState('');
  const [citations, setCitations] = useState<ProcessedCitation[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async (formData: FormData) => {
    setIsExtracting(true);
    setError('');
    try {
      const res = await parseDocument(formData);
      if (res.error) {
         setError(res.error);
      } else {
         setExtractedText(res.text);
         setCitations(res.citations.map((c, i) => ({ 
           ...c, 
           id: `cit-${i}`, 
           result: null, 
           tier: null 
         })));
         setActiveTab(2); // Move to auditor
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateCertificate = () => {
    setActiveTab(4); 
  };

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar no-print">
        <h2 style={{ color: 'var(--cream)', marginBottom: '32px', fontFamily: 'Source Serif 4, serif' }}>Citation Checker</h2>
        <nav className="sidebar-nav">
          <ul>
            <li><a href="#" className={activeTab === 1 ? 'active' : ''} onClick={(e)=>{e.preventDefault();setActiveTab(1)}}>1. Add Citations</a></li>
            <li><a href="#" className={activeTab === 2 || activeTab === 4 ? 'active' : ''} onClick={(e)=>{e.preventDefault();setActiveTab(2)}}>2. The Auditor</a></li>
            <li><a href="#" className={activeTab === 3 ? 'active' : ''} onClick={(e)=>{e.preventDefault();setActiveTab(3)}}>3. The Librarian</a></li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="content">
        <h1 className="no-print" style={{ marginBottom: '8px' }}>Welcome to the Citation Checker</h1>
        {error && (
           <div className="no-print" style={{ color: 'var(--rust)', padding: '12px', background: '#FDEDEC', borderRadius: '4px', marginBottom: '16px', borderLeft: '4px solid var(--rust)' }}>
             {error}
           </div>
        )}
        
        <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
           <Hopper onExtract={handleExtract} isExtracting={isExtracting} />
           <ScalesAnimation />
        </div>
        <div style={{ display: activeTab === 2 ? 'block' : 'none' }}>
           <Auditor citations={citations} setCitations={setCitations} onGenerateCertificate={handleGenerateCertificate} />
        </div>
        <div style={{ display: activeTab === 3 ? 'block' : 'none' }}>
           <div className="card no-print">
              <h2 style={{ marginBottom: '12px', fontFamily: 'Source Serif 4, serif' }}>3. The Librarian</h2>
              <p style={{ color: 'var(--stone)' }}>Court bundle generation (placeholder - not yet implemented).</p>
           </div>
        </div>
        <div style={{ display: activeTab === 4 ? 'block' : 'none' }}>
           <Certificate citations={citations} onBack={() => setActiveTab(2)} />
        </div>
      </main>
    </div>
  );
}
