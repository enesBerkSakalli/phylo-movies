import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useHomeUploadForm } from './useHomeUploadForm.js';
import { HomeHeader } from './components/HomeHeader.jsx';
import { HomeHero } from './components/HomeHero.jsx';
import { NewProjectTab } from './components/NewProjectTab.jsx';
import { ExampleTab } from './components/ExampleTab.jsx';
import { ProcessingOverlay } from './components/ProcessingOverlay.jsx';

import '../../css/home.css';

export function HomePage() {
  React.useEffect(() => {
    console.log("[HomePage] Mounted");
  }, []);

  const {
    form,
    treesFile,
    msaFile,
    submitting,
    loadingExample,
    progress,
    alert,
    handleSubmit,
    handleLoadExample,
    reset,
    setTreesFile,
    setMsaFile
  } = useHomeUploadForm();

  const disabled = submitting || loadingExample;

  return (
    <div className="home-page bg-background">
      <HomeHeader />

      <main className="container mx-auto max-w-4xl py-10 space-y-10">
        <HomeHero />

        <Card className="shadow-lg border-muted">
          <Tabs defaultValue="upload" className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">New Project</TabsTrigger>
                <TabsTrigger value="example">Load Example</TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-6">
              {alert && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                  <NewProjectTab
                    form={form}
                    treesFile={treesFile}
                    msaFile={msaFile}
                    setTreesFile={setTreesFile}
                    setMsaFile={setMsaFile}
                    disabled={disabled}
                    reset={reset}
                  />
                </form>
              </Form>

              <ExampleTab
                loadingExample={loadingExample}
                submitting={submitting}
                handleLoadExample={handleLoadExample}
              />
            </CardContent>
          </Tabs>
        </Card>

        {(submitting || loadingExample) && (
          <ProcessingOverlay progress={progress} />
        )}
      </main>
    </div>
  );
}

export default HomePage;
