import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Badge, BuildTypeBadge, ChannelBadge } from './ui/Badge';
import { Button } from './ui/Button';
import type { EdgeBuild, OfficeBuild, WindowsBuild } from '../types';

type BuildCardRecord = WindowsBuild | EdgeBuild | OfficeBuild;

interface BuildCardProps {
  build: BuildCardRecord;
  type: 'windows' | 'edge' | 'office';
  onClick?: () => void;
  index?: number;
}

const isWindowsBuild = (build: BuildCardRecord): build is WindowsBuild => 'uuid' in build;
const isEdgeBuild = (build: BuildCardRecord): build is EdgeBuild => 'Version' in build;
const isOfficeBuild = (build: BuildCardRecord): build is OfficeBuild => 'channel' in build && !('uuid' in build) && !('Version' in build);

export const BuildCard: React.FC<BuildCardProps> = ({ build, type, onClick, index = 0 }) => {
  const formatDate = (date?: string | number) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'windows':
        return (
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
            </svg>
          </div>
        );
      case 'edge':
        return (
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.86 17.86q.14-.11.28-.24a7.07 7.07 0 0 0 1.64-3.16A6.91 6.91 0 0 0 24 12.5a11.87 11.87 0 0 0-1.46-5.85 12.31 12.31 0 0 0-4-4.24A11.64 11.64 0 0 0 12.5.5a12.63 12.63 0 0 0-6.21 1.58 11.45 11.45 0 0 0-4.38 4.32A12.58 12.58 0 0 0 .5 12.43a11.79 11.79 0 0 0 .87 4.59 11.93 11.93 0 0 0 2.45 3.84 11.46 11.46 0 0 0 3.73 2.53 12.48 12.48 0 0 0 4.74.88A12.36 12.36 0 0 0 17 23.49a11.79 11.79 0 0 0 4.11-2.36c.35-.31.57-.51.71-.65z"/>
            </svg>
          </div>
        );
      case 'office':
        return (
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.53 4.306v15.363q0 .807-.472 1.433-.472.627-1.253.85l-6.888 1.974q-.136.037-.29.055-.156.019-.293.019-.396 0-.73-.105-.336-.106-.656-.292l-4.505-2.544q-.248-.137-.391-.366-.143-.23-.143-.515 0-.434.304-.738.304-.305.739-.305.198 0 .396.062l4.047 2.278 6.912-1.978v-14.3l-6.912 1.978-5.14-2.894q-.099-.062-.233-.062-.248 0-.495.13-.248.13-.248.458v15.925q0 .434-.303.738-.303.304-.739.304-.435 0-.739-.304-.303-.304-.303-.738V4.964q0-.496.248-.86.248-.363.669-.494l6.986-2.002q.123-.037.248-.055.124-.018.248-.018.198 0 .396.062.198.061.347.155l4.553 2.544q.261.149.421.373.161.224.161.508zm-9.646 1.855v11.948l4.704 1.345V7.506z"/>
            </svg>
          </div>
        );
    }
  };

  const getTitle = () => {
    if (isEdgeBuild(build)) return `Microsoft Edge ${build.Product || ''}`;
    if (isOfficeBuild(build)) return build.title || build.name || 'Office 365';
    return build.title || 'Unknown Build';
  };

  const getVersion = () => {
    if (isWindowsBuild(build)) return build.build_number || build.build || '';
    if (isEdgeBuild(build)) return build.Version || '';
    return build.build || build.version || '';
  };

  const getSummary = () => {
    if (isWindowsBuild(build)) return build.summary;
    if (isOfficeBuild(build)) return build.notes;
    return undefined;
  };

  const getDate = () => {
    if (isWindowsBuild(build)) return build.created || build.created_timestamp;
    if (isEdgeBuild(build)) return build.PublishedTime;
    return build.releaseDate;
  };

  const getDownloadUrl = () => {
    if (isWindowsBuild(build)) return `https://uupdump.net/selectlang.php?id=${build.uuid}`;
    if (isEdgeBuild(build) && build.Artifacts?.length) return build.Artifacts[0].Location;
    if (isOfficeBuild(build)) return 'https://www.microsoft.com/en-us/download/office.aspx';
    return null;
  };

  const summary = getSummary();

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };


  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: "easeInOut",
      }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card
        variant="glass"
        hover
        className="h-full cursor-pointer group"
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {getTitle()}
              </CardTitle>
              <CardDescription className="mt-1">
                {getVersion() && <span className="font-mono text-sm">{getVersion()}</span>}
              </CardDescription>
            </div>
            {getIcon()}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {isWindowsBuild(build) && build.build_type && (
              <BuildTypeBadge type={build.build_type} />
            )}
            {isWindowsBuild(build) && build.arch && (
              <Badge variant="secondary" size="sm">
                {build.arch}
              </Badge>
            )}
            {isEdgeBuild(build) && (
              <>
                {build.Product && <ChannelBadge channel={build.Product} />}
                {build.Platform && (
                  <Badge variant="info" size="sm">
                    {build.Platform}
                  </Badge>
                )}
                {build.Artifacts && build.Artifacts.length > 0 ? (
                  <Badge variant="success" size="sm">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Download Available
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    No Download
                  </Badge>
                )}
              </>
            )}
            {isOfficeBuild(build) && build.channel && (
              <Badge variant="primary" size="sm">
                {build.channel}
              </Badge>
            )}
            {isOfficeBuild(build) && build.latest && (
              <Badge variant="success" size="sm">
                Latest
              </Badge>
            )}
          </div>

          {summary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {summary}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {formatDate(getDate())}
              </span>
            </div>
            {isWindowsBuild(build) && build.uuid && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span className="font-mono truncate max-w-[100px]">{build.uuid}</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <div className="flex items-center justify-between w-full">
            {/* Conditionally show download button */}
            {getDownloadUrl() ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const url = getDownloadUrl();
                  if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Download
              </Button>
            ) : (
              <div /> // Empty div to maintain spacing
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) {
                  onClick();
                }
              }}
            >
              View Details
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
