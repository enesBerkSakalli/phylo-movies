import React from 'react';
import { Clock3, History, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { phyloData } from '../../../services/data/dataService.js';

export function RecentRunsPanel() {
  const navigate = useNavigate();
  const [runs, setRuns] = React.useState([]);
  const [busyRunId, setBusyRunId] = React.useState(null);
  const [error, setError] = React.useState(null);

  const refreshRuns = React.useCallback(async () => {
    setRuns(await phyloData.listRuns());
  }, []);

  React.useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  async function handleOpen(runId) {
    setError(null);
    setBusyRunId(runId);
    try {
      await phyloData.openRun(runId);
      navigate('/visualization');
    } catch (err) {
      setError(err?.message || 'Saved run could not be opened.');
      await refreshRuns();
    } finally {
      setBusyRunId(null);
    }
  }

  async function handleDelete(runId) {
    setError(null);
    setBusyRunId(runId);
    try {
      await phyloData.deleteRun(runId);
      await refreshRuns();
    } catch (err) {
      setError(err?.message || 'Saved run could not be removed.');
    } finally {
      setBusyRunId(null);
    }
  }

  if (runs.length === 0) return null;

  return (
    <section className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Recent runs</h2>
            <Badge variant="secondary" className="text-2xs">
              {runs.length}
            </Badge>
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>

        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <article
              key={run.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium">{run.label}</p>
                  {run.treeCount != null && (
                    <Badge variant="outline" className="shrink-0 text-2xs">
                      {run.treeCount} trees
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {formatRunTime(run.createdAt)}
                  </span>
                  {run.windowing && <span className="truncate">Windowing: {run.windowing}</span>}
                  {run.support && <span className="truncate">Scores: {run.support}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="default"
                  size="icon-sm"
                  onClick={() => handleOpen(run.id)}
                  disabled={busyRunId === run.id}
                  aria-label={`Open ${run.label}`}
                  title={`Open ${run.label}`}
                >
                  <Play />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(run.id)}
                  disabled={busyRunId === run.id}
                  aria-label={`Remove ${run.label}`}
                  title={`Remove ${run.label}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatRunTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
