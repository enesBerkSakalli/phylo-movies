import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Form } from '../../components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { TooltipProvider } from '../../components/ui/tooltip';

import { useWorkspaceInitializationForm } from './useWorkspaceInitializationForm.js';
import { NewProjectTab } from './components/NewProjectTab.jsx';
import { ExampleTab } from './components/ExampleTab.jsx';
import { ProcessingOverlay } from './components/ProcessingOverlay.jsx';

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

function getEngineStatus(state) {
  return ENGINE_STATUS[state] || ENGINE_STATUS.checking;
}

export function WorkspaceInitializationPage() {
  const [activeTab, setActiveTab] = React.useState('upload');
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
    reset,
  } = useWorkspaceInitializationForm();

  const disabled = submitting || loadingExample;
  const engineStatus = getEngineStatus(backendStatus.state);
  const EngineIcon = engineStatus.icon;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-background">
        <main className="flex min-h-full w-full flex-col">
          <section className="border-b bg-card/70 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Phylo-Movies</h1>
                <Badge variant="secondary" className="gap-1">
                  <EngineIcon />
                  Backend {engineStatus.label}
                </Badge>
              </div>
            </div>
          </section>

          {backendStatus.state !== 'ready' && (
            <Alert className="mx-4 mt-4 sm:mx-6 lg:mx-8 xl:mx-10">
              <EngineIcon />
              <AlertTitle>BranchArchitect backend: {engineStatus.badge}</AlertTitle>
              <AlertDescription>
                Loading examples, processing uploaded trees, interpolation, and MSA-derived tree
                inference require the BranchArchitect backend.
                {backendStatus.state === 'unavailable' && (
                  <>
                    {' '}
                    Start it with <code>./start.sh</code> or{' '}
                    <code>cd engine/BranchArchitect &amp;&amp; ./start_movie_server.sh</code>.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

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
                  <AlertTitle>Error</AlertTitle>
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
                  handleLoadExample={handleLoadExample}
                />
              </TabsContent>
            </section>
          </Tabs>

          {(submitting || loadingExample) && <ProcessingOverlay operationState={operationState} />}
        </main>
      </div>
    </TooltipProvider>
  );
}

export default WorkspaceInitializationPage;
