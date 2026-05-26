import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FileStack, GitBranch, SlidersHorizontal, Trees } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { ProjectFileSection } from './project/ProjectFileSection.jsx';
import { SlidingWindowSection } from './project/SlidingWindowSection.jsx';
import { TreeConstructionSection } from './project/TreeConstructionSection.jsx';
import { TreeAdjustmentSection } from './project/TreeAdjustmentSection.jsx';
import { ProjectActions } from './project/ProjectActions.jsx';
import { cn } from '../../../lib/utils';

export function NewProjectTab({ disabled: globalDisabled, reset }) {
  const { watch, setValue } = useFormContext();

  const msaFile = watch('msaFile');
  const treesFile = watch('treesFile');
  const windowSize = watch('windowSize');
  const stepSize = watch('stepSize');
  const treeInferenceEngine = watch('treeInferenceEngine') || 'iqtree';
  const useGtr = watch('useGtr');
  const useGamma = watch('useGamma');
  const iqtreeFastSearch = watch('iqtreeFastSearch');
  const iqtreeSupportMode = watch('iqtreeSupportMode') || 'none';
  const midpointRooting = watch('midpointRooting');

  const hasMsa = !!msaFile;
  const hasTrees = !!treesFile;
  const canSubmit = hasMsa || hasTrees;
  const processingPath = getProcessingPath({ hasMsa, hasTrees });
  const showWindowSettings = hasMsa;
  const showInferenceSettings = hasMsa && !hasTrees;
  const showAdjustmentSettings = canSubmit;
  const layoutClassName = cn(
    'animate-in grid min-w-0 gap-5 fade-in slide-in-from-bottom-2 duration-500 xl:items-start',
    canSubmit && 'xl:grid-cols-[minmax(34rem,0.9fr)_minmax(40rem,1.1fr)]'
  );
  const compactPanelClassName = cn(
    'grid min-w-0 items-start gap-3',
    showWindowSettings && showAdjustmentSettings && 'lg:grid-cols-2'
  );

  return (
    <div className={layoutClassName}>
      <div className="flex min-w-0 flex-col gap-4">
        <ProjectFileSection
          treesFile={treesFile}
          msaFile={msaFile}
          setTreesFile={(f) => setValue('treesFile', f, { shouldValidate: true })}
          setMsaFile={(f) => setValue('msaFile', f, { shouldValidate: true })}
          disabled={globalDisabled}
        />

        {canSubmit && <ProcessingPathAlert path={processingPath} />}
      </div>

      {canSubmit && (
        <section className="flex min-w-0 flex-col gap-4 rounded-lg border bg-muted/10 p-4">
          <div className="flex min-w-0 flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <SlidersHorizontal className="size-4" />
                Analysis settings
              </div>
            </div>
            <ProjectActions
              disabled={globalDisabled}
              reset={reset}
              canSubmit={canSubmit}
              className="shrink-0"
            />
          </div>

          <div className="grid min-w-0 items-start gap-3">
            {(showWindowSettings || showAdjustmentSettings) && (
              <div className={compactPanelClassName}>
                {showWindowSettings && (
                  <SettingsPanel
                    icon={SlidersHorizontal}
                    title={hasTrees ? 'MSA Window Mapping' : 'Sliding Windows'}
                    summary={`${windowSize} sites / ${stepSize} step`}
                  >
                    <SlidingWindowSection
                      hasMsa={hasMsa}
                      hasTrees={hasTrees}
                      disabled={globalDisabled}
                      embedded
                    />
                  </SettingsPanel>
                )}

                {showAdjustmentSettings && (
                  <SettingsPanel
                    icon={GitBranch}
                    title="Tree Adjustments"
                    summary={midpointRooting ? 'Midpoint rooting on' : 'Midpoint rooting off'}
                  >
                    <TreeAdjustmentSection disabled={globalDisabled} embedded />
                  </SettingsPanel>
                )}
              </div>
            )}

            {showInferenceSettings && (
              <SettingsPanel
                icon={Trees}
                title="Tree Inference"
                summary={getInferenceSummary({
                  hasMsa,
                  treeInferenceEngine,
                  useGtr,
                  useGamma,
                  iqtreeFastSearch,
                  iqtreeSupportMode,
                })}
              >
                <TreeConstructionSection hasMsa={hasMsa} disabled={globalDisabled} embedded />
              </SettingsPanel>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ProcessingPathAlert({ path }) {
  const PathIcon = path.icon;
  return (
    <Alert>
      <PathIcon />
      <AlertTitle>{path.title}</AlertTitle>
      <AlertDescription>{path.description}</AlertDescription>
    </Alert>
  );
}

function SettingsPanel({ icon: Icon, title, summary, children }) {
  return (
    <section className="rounded-md border bg-background px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">{title}</span>
          <span className="mt-1 block truncate text-2xs font-normal leading-tight text-muted-foreground">
            {summary}
          </span>
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function getProcessingPath({ hasMsa, hasTrees }) {
  if (hasTrees && hasMsa) {
    return {
      key: 'trees-msa',
      title: 'Processing path: uploaded trees with MSA context',
      description:
        'Uploaded trees drive the movie; the MSA supplies alignment context and window mapping.',
      icon: FileStack,
    };
  }
  if (hasTrees) {
    return {
      key: 'trees-only',
      title: 'Processing path: uploaded tree series',
      description:
        'The supplied tree series is normalized and converted into interpolation frames.',
      icon: Trees,
    };
  }
  if (hasMsa) {
    return {
      key: 'msa-inference',
      title: 'Processing path: MSA sliding-window inference',
      description: 'MSA windows are inferred into a tree series before movie construction.',
      icon: SlidersHorizontal,
    };
  }
  return {
    key: 'none',
    title: 'Processing path: choose input files',
    description:
      'Trees only, MSA only, and trees plus MSA are different backend paths. Select files first so the page can show only the relevant settings.',
    icon: FileStack,
  };
}

function getInferenceSummary({
  hasMsa,
  treeInferenceEngine,
  useGtr,
  useGamma,
  iqtreeFastSearch,
  iqtreeSupportMode,
}) {
  if (!hasMsa) return 'MSA required';

  const engineLabel = treeInferenceEngine === 'fasttree' ? 'FastTree 2' : 'IQ-TREE';
  const modelLabel = `${useGtr ? 'GTR' : 'JC'}${useGamma ? '+G' : ''}`;
  if (treeInferenceEngine === 'fasttree') {
    return `${engineLabel} · ${modelLabel}`;
  }
  if (iqtreeSupportMode !== 'none') {
    return `${engineLabel} · ${modelLabel} · ${getSupportLabel(iqtreeSupportMode)}`;
  }
  return `${engineLabel} · ${modelLabel} · ${iqtreeFastSearch ? 'Fast search' : 'Thorough search'}`;
}

function getSupportLabel(mode) {
  if (mode === 'ufboot') return 'UFBoot';
  if (mode === 'sh_alrt') return 'SH-aLRT';
  if (mode === 'sh_alrt_ufboot') return 'SH-aLRT + UFBoot';
  return 'No support';
}
