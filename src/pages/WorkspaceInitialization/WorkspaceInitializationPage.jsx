import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Database, Film, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Form } from '../../components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { TooltipProvider } from '../../components/ui/tooltip';

import { useWorkspaceInitializationForm } from './useWorkspaceInitializationForm.js';
import { NewProjectTab } from './components/NewProjectTab.jsx';
import { ExampleTab } from './components/ExampleTab.jsx';
import { ProcessingOverlay } from './components/ProcessingOverlay.jsx';
import { RecentRunsPanel } from './components/RecentRunsPanel.jsx';
import { DEMO_EXAMPLE_DATASETS } from './exampleDatasets.js';
import { APP_PREVIEW_IMAGE_URL } from '../shared/previewAssets.js';

const ENGINE_STATUS = {
  ready: {
    label: 'Connected',
    badge: 'Ready',
    icon: CheckCircle2,
  },
  unavailable: {
    label: 'Offline',
    badge: 'Offline',
    icon: AlertTriangle,
  },
  checking: {
    label: 'Checking',
    badge: 'Checking',
    icon: CircleDashed,
  },
};

const ALERT_CODE_CLASS =
  'rounded border border-current/20 bg-background/70 px-1.5 py-0.5 font-mono text-[0.85em] text-current';

function getEngineStatus(state) {
  return ENGINE_STATUS[state] || ENGINE_STATUS.checking;
}

export function WorkspaceInitializationPage({ demoOnly = false }) {
  const [activeTab, setActiveTab] = React.useState(demoOnly ? 'example' : 'upload');
  const {
    form,
    submitting,
    loadingExample,
    loadingExampleId,
    operationState,
    backendStatus,
    alert,
    handleSubmit,
    handleLoadExample,
    handleOpenPrecomputedExample,
    cancelOperation,
    reset,
  } = useWorkspaceInitializationForm({ skipBackendCheck: demoOnly });

  const backendReady = backendStatus.state === 'ready';
  const disabled = submitting || loadingExample || !backendReady;
  const engineStatus = getEngineStatus(backendStatus.state);
  const EngineIcon = demoOnly ? Database : engineStatus.icon;
  const backendBadgeVariant =
    !demoOnly && backendStatus.state === 'unavailable' ? 'destructive' : 'secondary';
  const exampleDatasets = demoOnly ? DEMO_EXAMPLE_DATASETS : undefined;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-background">
        <main className="flex min-h-full w-full flex-col">
          <section className="border-b bg-card/70 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Phylo-Movies</h1>
                <Badge variant={backendBadgeVariant} className="gap-1">
                  <EngineIcon />
                  {demoOnly ? 'Generated Examples' : `Backend ${engineStatus.label}`}
                </Badge>
              </div>
            </div>
          </section>

          {!demoOnly && backendStatus.state !== 'ready' && (
            <Alert
              variant={backendStatus.state === 'unavailable' ? 'destructive' : 'default'}
              className="mx-4 mt-4 sm:mx-6 lg:mx-8 xl:mx-10"
            >
              <EngineIcon />
              <AlertTitle>BranchArchitect backend: {engineStatus.badge}</AlertTitle>
              <AlertDescription>
                <p>
                  Loading examples, processing uploaded trees, interpolation, and MSA-derived tree
                  inference require the BranchArchitect backend.
                </p>
                {backendStatus.state === 'checking' && (
                  <p>
                    Waiting for readiness from <code className={ALERT_CODE_CLASS}>/health</code>.
                  </p>
                )}
                {backendStatus.state === 'unavailable' && (
                  <p>
                    Start it with <code className={ALERT_CODE_CLASS}>./start.sh</code>, or run{' '}
                    <code className={ALERT_CODE_CLASS}>
                      cd engine/BranchArchitect &amp;&amp; ./start_movie_server.sh
                    </code>
                    .
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!demoOnly && <ApplicationPreviewHero />}

          {!demoOnly && <RecentRunsPanel />}

          {demoOnly ? (
            <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 xl:px-10">
              {alert && (
                <Alert variant="destructive" className="mb-5">
                  <AlertTriangle />
                  <AlertTitle>{alert.title || 'Action needed'}</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}

              <ExampleTab
                examples={exampleDatasets}
                demoOnly
                loadingExample={loadingExample}
                loadingExampleId={loadingExampleId}
                submitting={submitting}
                backendReady
                handleLoadExample={handleOpenPrecomputedExample}
              />
            </section>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex min-w-0 flex-1 flex-col gap-0"
            >
              <section className="border-b border-border/60 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
                <div className="flex min-w-0 justify-start">
                  <TabsList className="grid w-full grid-cols-2 sm:w-[28rem]">
                    <TabsTrigger value="upload">New Project</TabsTrigger>
                    <TabsTrigger value="example">Example Library</TabsTrigger>
                  </TabsList>
                </div>
              </section>

              <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 xl:px-10">
                {alert && (
                  <Alert variant="destructive" className="mb-5">
                    <AlertTriangle />
                    <AlertTitle>{alert.title || 'Action needed'}</AlertTitle>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <TabsContent value="upload" className="m-0">
                      <NewProjectTab disabled={disabled} reset={reset} />
                    </TabsContent>
                  </form>
                </Form>

                <TabsContent value="example" className="m-0">
                  <ExampleTab
                    loadingExample={loadingExample}
                    loadingExampleId={loadingExampleId}
                    submitting={submitting}
                    backendReady={backendReady}
                    handleLoadExample={handleLoadExample}
                  />
                </TabsContent>
              </section>
            </Tabs>
          )}

          {(submitting || loadingExample) && (
            <ProcessingOverlay
              operationState={operationState}
              onCancel={demoOnly ? undefined : cancelOperation}
            />
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

function ApplicationPreviewHero() {
  return (
    <section className="relative overflow-hidden border-b bg-background">
      <img
        src={APP_PREVIEW_IMAGE_URL}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
      <div className="relative px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <div className="max-w-3xl space-y-4">
          <Badge variant="secondary" className="gap-1">
            <Film className="size-3.5" aria-hidden />
            Full application
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start a Phylo-Movies workspace
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Process uploaded tree series, infer sliding-window trees from alignments, or load
              bundled examples with the BranchArchitect backend.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Upload className="size-4" aria-hidden />
            Use New Project or Example Library below
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceInitializationPage;
