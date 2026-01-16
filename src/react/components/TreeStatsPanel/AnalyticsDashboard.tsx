import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BarChart, Activity } from 'lucide-react';
import { SubtreeFrequencyBarChart } from './SubtreeAnalytics/SubtreeFrequencyBarChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AnalyticsDashboard = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs border text-muted-foreground" title="Open Advanced Analytics">
          <Activity className="size-3 mr-2" />
          Analytics Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[800px] h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pr-10 pb-4">
          <DialogTitle>Subtree Analytics</DialogTitle>
          <DialogDescription>
            Visualize the most frequently jumping subtrees across the animation.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="w-full justify-start mb-2 shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details" disabled>Detailed Stats</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <TabsContent value="overview" className="mt-0 pb-6 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart className="size-4" />
                    Top Jumping Subtrees
                  </CardTitle>
                  <CardDescription>
                    Subtrees that jump most frequently during tree transitions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <SubtreeFrequencyBarChart />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <div className="p-4 text-center text-muted-foreground">
                Detailed stats coming soon.
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
