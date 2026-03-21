'use client'

import { useState } from 'react';
import { ProcessedCitation, verifyCitations } from '@/app/actions';
import { formatCitationDisplay } from '@/lib/extractor';
import ImageCarousel from './ImageCarousel';

interface AuditorProps {
  citations: ProcessedCitation[];
  setCitations: (citations: ProcessedCitation[]) => void;
  onGenerateCertificate: () => void;
}

const TIER_MAP: Record<string, { label: string, color: string, badgeClass: string }> = {
  EXACT_MATCH: { label: 'Verified', color: 'var(--sage)', badgeClass: 'badge-verified' },
  PARTIAL_MATCH: { label: 'Likely Match', color: 'var(--amber)', badgeClass: 'badge-likely' },
  POTENTIAL_MATCH: { label: 'Possible Match', color: 'var(--sky)', badgeClass: 'badge-possible' },
  CITED_IN_OTHER_CASES: { label: 'Cited Elsewhere', color: 'var(--plum)', badgeClass: 'badge-cited' },
  NOT_FOUND: { label: 'Not Found', color: 'var(--rust)', badgeClass: 'badge-notfound' }
};

export default function Auditor({ citations, setCitations, onGenerateCertificate }: AuditorProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      const verified = await verifyCitations(citations);
      setCitations(verified);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStats = () => {
    const stats: Record<string, number> = {
      EXACT_MATCH: 0,
      PARTIAL_MATCH: 0,
      POTENTIAL_MATCH: 0,
      CITED_IN_OTHER_CASES: 0,
      NOT_FOUND: 0
    };
    citations.forEach(c => {
      if (c.tier && stats[c.tier] !== undefined) {
        stats[c.tier]++;
      }
    });
    return stats;
  };

  const ObjectEntries = Object.entries as <T>(o: T) => [Extract<keyof T, string>, T[keyof T]][];
  const stats = getStats();
  const isAudited = citations.some(c => c.tier !== null);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Source Serif 4, serif' }}>2. The Auditor</h2>
        {citations.length > 0 && !isVerifying && !isAudited && (
          <button onClick={handleVerify}>Run Audit ({citations.length} Citations)</button>
        )}
        {isVerifying && <button disabled>Auditing... Please wait</button>}
        {isAudited && !isVerifying && (
          <button className="secondary-button" onClick={onGenerateCertificate}>Certificate of Accuracy</button>
        )}
      </div>

      {isAudited && (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {ObjectEntries(TIER_MAP).map(([tierKey, config]) => (
            <div key={tierKey as string} style={{
              flex: 1, minWidth: '130px', padding: '16px', borderRadius: '8px', 
              borderLeft: `4px solid ${config.color}`, background: 'var(--sand)', textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, fontFamily: 'Source Serif 4, serif', color: 'var(--ink)' }}>
                {stats[tierKey]}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.8, marginTop: '4px', color: 'var(--espresso)' }}>
                {config.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {isVerifying ? (
        <ImageCarousel />
      ) : citations.length > 0 ? (
         <table className="audit-table">
          <thead>
            <tr>
              <th style={{width: '35%'}}>Citation in Document</th>
              <th style={{width: '20%'}}>Status</th>
              <th style={{width: '45%'}}>SAFLII Match / Resolution</th>
            </tr>
          </thead>
          <tbody>
            {citations.map(c => {
              const display = formatCitationDisplay(c);
              const tierConfig = c.tier ? TIER_MAP[c.tier] : null;
              
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontFamily: 'Source Serif 4, serif', fontStyle: 'italic', fontWeight: 600, color: 'var(--espresso)', marginBottom: '4px' }}>
                      {display}
                    </div>
                    <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--stone)' }}>
                      Type: {c.type}
                    </div>
                  </td>
                  <td>
                    {c.result ? (
                      <div>
                        {tierConfig && <span className={`badge ${tierConfig.badgeClass}`}>{tierConfig.label}</span>}
                        {c.result.match_confidence > 0 && (
                          <div className="mono" style={{ fontSize: '0.7rem', marginTop: '6px', color: 'var(--stone)' }}>
                            Score: {c.result.match_confidence}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="mono" style={{ color: 'var(--stone)', fontSize: '0.8rem' }}>Pending...</span>
                    )}
                  </td>
                  <td>
                    {c.result ? (
                      <div>
                        {c.result.status === 'not_found' && (
                           <div style={{ color: 'var(--rust)', fontSize: '0.85rem' }}>No case found on SAFLII.</div>
                        )}
                        {c.result.title && (
                          <a href={c.result.url} target="_blank" rel="noreferrer" style={{ color: 'var(--terracotta)', fontWeight: 500, textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                            {c.result.title}
                          </a>
                        )}
                        {c.result.saflii_citation && (
                          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--sky)', marginBottom: '4px' }}>
                            {c.result.saflii_citation}
                          </div>
                        )}
                        {c.result.status === 'mismatch_resolved' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--amber)', background: '#FEF5E7', padding: '6px', borderRadius: '4px', borderLeft: '3px solid var(--amber)', marginTop: '6px' }}>
                            <strong>Mismatch Resolved:</strong> URL pointed to <em>{c.result.cited_case_title}</em>. Search fallback found correct case.
                          </div>
                        )}
                        {c.result.year_discrepancy && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--amber)', background: '#FEF5E7', padding: '6px', borderRadius: '4px', borderLeft: '3px solid var(--amber)', marginTop: '6px' }}>
                            <strong>Year Discrepancy:</strong> Document says {c.result.year_discrepancy.document}, SAFLII says {c.result.year_discrepancy.saflii}
                          </div>
                        )}
                        {c.result.status === 'cited_in_other_cases' && (
                           <div style={{ fontSize: '0.8rem', color: 'var(--plum)', marginTop: '6px' }}>
                             Referenced in {c.result.citing_cases_count} case(s), e.g. <a href={c.result.top_citing_url} target="_blank" style={{color: 'var(--plum)'}}>{c.result.top_citing_title}</a>
                           </div>
                        )}
                        
                        {/* Search Trail */}
                        {c.result.search_trail && c.result.search_trail.length > 0 && (
                           <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--stone)', marginTop: '8px', lineHeight: 1.4 }}>
                             {c.result.search_trail.map((t, idx) => (
                               <div key={idx}>→ {t.source}: {t.result}</div>
                             ))}
                           </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--stone)', fontSize: '0.8rem' }}>Waiting for audit</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'var(--stone)' }}>No citations to audit yet. Upload a document in step 1.</p>
      )}
    </div>
  );
}
