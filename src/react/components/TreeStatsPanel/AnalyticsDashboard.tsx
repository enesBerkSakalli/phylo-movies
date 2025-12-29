import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
      <DialogContent className="!max-w-[800px] w-full flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>Subtree Analytics</DialogTitle>
          <DialogDescription>
            Visualize the most frequently jumping subtrees across the animation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
