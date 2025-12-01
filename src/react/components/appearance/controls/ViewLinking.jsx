import React from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Link2Off } from 'lucide-react';
import { useAppStore } from '../../../../js/core/store.js';

export function ViewLinking() {
  const viewsConnected = useAppStore((s) => s.viewsConnected);
  const setViewsConnected = useAppStore((s) => s.setViewsConnected);

  const handleToggle = () => {
    setViewsConnected(!viewsConnected);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={viewsConnected ? 'default' : 'outline'}
        onClick={handleToggle}
        className="w-full justify-start"
        title="Link left/right tree views using mapping (anchors stay stable, movers highlighted)"
      >
        {viewsConnected ? <Link2 className="mr-2 size-4" /> : <Link2Off className="mr-2 size-4" />}
        {viewsConnected ? 'Disconnect views' : 'Connect views'}
      </Button>
    </div>
  );
}

export default ViewLinking;
