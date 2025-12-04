import { useCallback, useState } from "react";

export function useForceUpdate() {
  const [, setV] = useState(0);
  return useCallback(() => setV(v => v + 1), []);
}
