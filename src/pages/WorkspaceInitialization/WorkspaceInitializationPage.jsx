import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useWorkspaceInitializationForm } from './useWorkspaceInitializationForm.js';
import { WorkspaceInitializationHero } from './components/WorkspaceInitializationHero.jsx';
import { NewProjectTab } from './components/NewProjectTab.jsx';
import { ExampleTab } from './components/ExampleTab.jsx';
import { ProcessingOverlay } from './components/ProcessingOverlay.jsx';

import '../../css/home.css';

export function WorkspaceInitializationPage() {
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
  } = useWorkspaceInitializationForm();

  const disabled = submitting || loadingExample;

  return (
    <div className="home-page bg-background">
      <main className="container mx-auto max-w-4xl py-8 space-y-8">
        <WorkspaceInitializationHero />

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
