import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useHomeUploadForm } from '@/pages/WorkspaceInitialization/useHomeUploadForm.js';
import { HomeHero } from '@/pages/WorkspaceInitialization/components/HomeHero.jsx';
import { NewProjectTab } from '@/pages/WorkspaceInitialization/components/NewProjectTab.jsx';
import { ExampleTab } from '@/pages/WorkspaceInitialization/components/ExampleTab.jsx';
import { ProcessingOverlay } from '@/pages/WorkspaceInitialization/components/ProcessingOverlay.jsx';

import './workspaceInitialization.css';

export function WorkspaceInitializationPage() {
  React.useEffect(() => {
    console.log("[WorkspaceInitializationPage] Mounted");
  }, []);

  const {
    form,
    submitting,
    loadingExample,
    loadingExampleId,
    operationState,
    alert,
    handleSubmit,
    handleLoadExample,
    reset,
  } = useHomeUploadForm();

  const disabled = submitting || loadingExample;

  return (
    <div className="home-page bg-background">
      <main className="container mx-auto max-w-4xl py-8 space-y-8">
        <HomeHero />

        <Card className="shadow-lg border-muted">
          <Tabs defaultValue="upload" className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">New Project</TabsTrigger>
                <TabsTrigger value="example">Load Example</TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-4">
              {alert && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                  <NewProjectTab
                    disabled={disabled}
                    reset={reset}
                  />
                </form>
              </Form>

              <ExampleTab
                loadingExample={loadingExample}
                loadingExampleId={loadingExampleId}
                submitting={submitting}
                handleLoadExample={handleLoadExample}
              />
            </CardContent>
          </Tabs>
        </Card>

        {(submitting || loadingExample) && (
          <ProcessingOverlay operationState={operationState} />
        )}
      </main>
    </div>
  );
}

export default WorkspaceInitializationPage;
