import React from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Form } from "../../components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { TooltipProvider } from "../../components/ui/tooltip";

import { useWorkspaceInitializationForm } from './useWorkspaceInitializationForm.js';
import { WorkspaceInitializationHero } from './components/WorkspaceInitializationHero.jsx';
import { NewProjectTab } from './components/NewProjectTab.jsx';
import { ExampleTab } from './components/ExampleTab.jsx';
import { ProcessingOverlay } from './components/ProcessingOverlay.jsx';

export function WorkspaceInitializationPage() {
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

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-background">
        <main className="container mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 sm:py-8">
          <WorkspaceInitializationHero />

          <Card className="gap-0 border-muted py-0 shadow-sm">
            <Tabs defaultValue="upload" className="w-full gap-0">
              <CardHeader className="border-b border-border/40 p-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">New Project</TabsTrigger>
                  <TabsTrigger value="example">Load Example</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {backendStatus.state === 'unavailable' && (
                  <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <AlertTitle>Backend not connected</AlertTitle>
                    <AlertDescription className="text-amber-900 dark:text-amber-100/90">
                      BranchArchitect is not reachable on port 5002. Start the full stack with{' '}
                      <code>./start.sh</code>, or run{' '}
                      <code>cd engine/BranchArchitect && ./start_movie_server.sh</code> for
                      interpolation, examples, and MSA workflows.
                    </AlertDescription>
                  </Alert>
                )}

                {alert && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <TabsContent value="upload" className="m-0">
                      <NewProjectTab
                        disabled={disabled}
                        reset={reset}
                      />
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
              </CardContent>
            </Tabs>
          </Card>

          {(submitting || loadingExample) && (
            <ProcessingOverlay operationState={operationState} />
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

export default WorkspaceInitializationPage;
