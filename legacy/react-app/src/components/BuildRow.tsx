import React, { useState } from 'react';
import { Build, TabType } from '../types';
import { BuildModal } from './BuildModal';

interface BuildRowProps {
  build: Build;
  buildType: TabType;
}

export const BuildRow: React.FC<BuildRowProps> = ({ build, buildType }) => {
  const [showModal, setShowModal] = useState(false);
  
  const getBuildTypeClass = (type: string) => {
    switch (type) {
      case 'canary': return 'label label--orange';
      case 'dev': return 'label label--skyBlue';
      case 'beta': return 'label label--royalBlue';
      case 'insider': return 'label label--green';
      case 'release': return 'label label--silver';
      default: return 'label';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <>
      <tr className="dataList-row dataList-row--aligned" data-build-type={build.build_type}>
        <td className="dataList-cell dataList-cell--main">
          <a 
            href="#" 
            onClick={handleClick}
            className="dataList-mainRow"
            title={build.summary_tooltip || 'Click for details'}
          >
            {build.title}
          </a>
          <div className="dataList-subRow">
            <span className={getBuildTypeClass(build.build_type)}>
              {build.build_type}
            </span>
            {build.latest && (
              <span className="label label--primary">Latest</span>
            )}
          </div>
        </td>
        <td className="dataList-cell">
          {build.build_number || build.version || '-'}
        </td>
        <td className="dataList-cell">
          {formatDate(build.created_timestamp)}
        </td>
        <td className="dataList-cell">
          {build.arch || build.architecture || '-'}
        </td>
      </tr>
      
      {showModal && (
        <BuildModal
          build={build}
          buildType={buildType}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};