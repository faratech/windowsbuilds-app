import React, { useEffect, useState } from 'react';
import { Build, TabType } from '../types';
import { buildsApi } from '../services/api';

interface BuildModalProps {
  build: Build;
  buildType: TabType;
  onClose: () => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({ build, buildType, onClose }) => {
  const [summary, setSummary] = useState<string>(build.summary_tooltip || 'Loading summary...');
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        let type: 'windows' | 'edge' | 'office';
        let additionalData: Record<string, string> = {};
        
        if (buildType === 'edge') {
          type = 'edge';
          additionalData = {
            version: build.version || '',
            channel: build.channel || '',
            platform: build.platform || ''
          };
        } else if (buildType === 'office') {
          type = 'office';
          additionalData = {
            build_number: build.build_number || '',
            channel: build.channel || '',
            version: build.version || '',
            latest: String(build.latest || false)
          };
        } else {
          type = 'windows';
        }
        
        const result = await buildsApi.fetchBuildSummary(
          build.uuid,
          build.title,
          type,
          additionalData
        );
        
        setSummary(result.summary);
      } catch (error) {
        setSummary('Failed to load summary. Please try again later.');
      } finally {
        setLoadingSummary(false);
      }
    };

    if (build.uuid && !build.summary_tooltip) {
      fetchSummary();
    } else {
      setLoadingSummary(false);
    }
  }, [build, buildType]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="build-modal-backdrop" onClick={handleBackdropClick}>
      <div className="build-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="build-modal-header">
          <h2 id="modal-title">{build.title}</h2>
          <button className="build-modal-close" onClick={onClose} aria-label="Close">
            <i className="fa fa-times"></i>
          </button>
        </div>
        
        <div className="build-modal-content">
          <div className="block">
            <div className="block-container">
              <h3 className="block-minorHeader">Build Details</h3>
              <div className="block-body">
                <dl className="pairs pairs--justified">
                  <dt>Build Number:</dt>
                  <dd>{build.build_number || 'N/A'}</dd>
                  
                  {build.version && (
                    <>
                      <dt>Version:</dt>
                      <dd>{build.version}</dd>
                    </>
                  )}
                  
                  <dt>Release Date:</dt>
                  <dd>{build.created}</dd>
                  
                  <dt>Architecture:</dt>
                  <dd>{build.arch || build.architecture || 'N/A'}</dd>
                  
                  {build.channel && (
                    <>
                      <dt>Channel:</dt>
                      <dd>{build.channel}</dd>
                    </>
                  )}
                  
                  {build.platform && (
                    <>
                      <dt>Platform:</dt>
                      <dd>{build.platform}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
          
          <div className="block">
            <div className="block-container">
              <h3 className="block-minorHeader">Summary</h3>
              <div className="block-body">
                {loadingSummary ? (
                  <div className="block-row">
                    <i className="fa fa-spinner fa-spin"></i> Loading summary...
                  </div>
                ) : (
                  <div className="block-row">{summary}</div>
                )}
              </div>
            </div>
          </div>
          
          {build.artifacts && build.artifacts.length > 0 && (
            <div className="block">
              <div className="block-container">
                <h3 className="block-minorHeader">Downloads</h3>
                <div className="block-body">
                  <div className="listPlain">
                    {build.artifacts.map((artifact, index) => (
                      <div key={index} className="listPlain-item">
                        <a 
                          href={artifact.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="link link--external"
                        >
                          <i className="fa fa-download"></i> {artifact.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {build.cves && build.cves.length > 0 && (
            <div className="block">
              <div className="block-container">
                <h3 className="block-minorHeader">Security Updates (CVEs)</h3>
                <div className="block-body">
                  <div className="listPlain">
                    {build.cves.map((cve, index) => (
                      <div key={index} className="listPlain-item">{cve}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="build-modal-footer">
            <a 
              href={`https://uupdump.net/?id=${build.uuid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button--link"
            >
              <i className="fa fa-external-link-alt"></i> View on UUP Dump
            </a>
            <button className="button button--primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};