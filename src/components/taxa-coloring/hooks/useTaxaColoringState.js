import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ColorSchemeManager } from '../../../treeColoring/utils/ColorSchemeManager.js';
import { generateGroups } from '../../../treeColoring/utils/GroupingUtils.js';
import { syncGroupColors } from '../utils/colorManagement.js';
import { useCSVState } from './useCSVState.js';
import { toHexMap } from '../../../services/ui/colorUtils.js';

const GROUP_NAME_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareGroupedTargets(a, b) {
  return GROUP_NAME_COLLATOR.compare(String(a?.name ?? ''), String(b?.name ?? ''));
}

function orderedColorTargets(items, isGrouped) {
  return isGrouped ? [...items].sort(compareGroupedTargets) : items;
}

function toPlainMap(maybeMap) {
  if (maybeMap instanceof Map) return Object.fromEntries(maybeMap);
  return maybeMap && typeof maybeMap === 'object' ? maybeMap : null;
}

export function useTaxaColoringState(taxaNames, originalColorMap, initialStateParam = {}) {
  const initialState = initialStateParam || {};

  // The taxa and group color maps are the single source of truth and live in
  // React state, updated immutably. ColorSchemeManager is used only as a
  // stateless computation engine (palette generation and ordering) when a
  // scheme is applied, not as a mutable store, so there is no version counter
  // to force re-renders.
  const [normalizedOriginal] = useState(
    () => new ColorSchemeManager(originalColorMap).taxaColorMap
  );

  const [taxaColorMap, setTaxaColorMap] = useState(() => {
    const savedTaxa = toPlainMap(initialState.taxaColorMap);
    return savedTaxa ? { ...normalizedOriginal, ...savedTaxa } : { ...normalizedOriginal };
  });

  const [mode, setMode] = useState(initialState.mode || 'taxa');
  const [selectedStrategy, setSelectedStrategy] = useState(initialState.strategyType || 'prefix');
  const [separators, setSeparators] = useState(
    Array.isArray(initialState.separators) ? initialState.separators : []
  );
  const [segmentIndex, setSegmentIndex] = useState(initialState.segmentIndex ?? 0);
  const [useRegex, setUseRegex] = useState(initialState.useRegex ?? false);
  const [regexPattern, setRegexPattern] = useState(initialState.regexPattern || '');

  // Reopening in groups mode regenerates the saved grouping once during
  // initialization and seeds the group state from it, rather than running a
  // mount effect that then forces a second render (advanced-init-once).
  const [initialGrouping] = useState(() => {
    if (initialState.mode !== 'groups' || taxaNames.length === 0) return null;
    const res = generateGroups(
      taxaNames,
      Array.isArray(initialState.separators) && initialState.separators.length > 0
        ? initialState.separators
        : null,
      initialState.strategyType || 'prefix',
      {
        segmentIndex: initialState.segmentIndex || 0,
        useRegex: initialState.useRegex || false,
        regexPattern: initialState.regexPattern || '',
      }
    );
    return res ?? null;
  });

  const [groupColorMap, setGroupColorMap] = useState(() => {
    const savedGroups = toPlainMap(initialState.groupColorMap);
    const base = savedGroups ? { ...savedGroups } : {};
    return initialGrouping?.groups ? syncGroupColors(base, initialGrouping.groups) : base;
  });
  const [groups, setGroups] = useState(initialGrouping?.groups ?? []);
  const [groupingResult, setGroupingResult] = useState(initialGrouping ?? null);

  const {
    csvData,
    csvFileName,
    csvGroups,
    csvTaxaMap,
    csvColumn,
    csvValidation,
    csvError,
    onFile,
    onMetadataSource,
    onColumnChange,
    resetCSV,
  } = useCSVState(taxaNames, initialState);

  // Give CSV groups their default colors while CSV assignments are active.
  // Pattern and CSV modes share the group color map, so this runs only in CSV
  // mode. Adjusted during render via the store-previous-value pattern rather
  // than a setState-in-effect (rerender-derived-state-no-effect).
  const csvSyncSignal = mode === 'csv' ? csvGroups : null;
  const [prevCsvSyncSignal, setPrevCsvSyncSignal] = useState(csvSyncSignal);
  if (csvSyncSignal !== prevCsvSyncSignal) {
    setPrevCsvSyncSignal(csvSyncSignal);
    if (mode === 'csv' && csvGroups.length > 0) {
      setGroupColorMap((prev) => syncGroupColors(prev, csvGroups));
    }
  }

  const applyScheme = useCallback(
    (id, targetMode) => {
      const itemsMap = {
        taxa: { items: taxaNames, isGrouped: false },
        groups: { items: groups, isGrouped: true },
        csv: { items: csvGroups, isGrouped: true },
      };
      const { items, isGrouped } = itemsMap[targetMode];
      // Compute the assignments with a throwaway manager, then fold them into the
      // color-map state immutably.
      const scratch = new ColorSchemeManager();
      scratch.applyColorScheme(id, orderedColorTargets(items, isGrouped), isGrouped);
      if (isGrouped) {
        setGroupColorMap((prev) => ({ ...prev, ...scratch.groupColorMap }));
      } else {
        setTaxaColorMap((prev) => ({ ...prev, ...scratch.taxaColorMap }));
      }
    },
    [taxaNames, groups, csvGroups]
  );

  const updateGroups = useCallback(() => {
    const options = {
      segmentIndex,
      useRegex,
      regexPattern,
    };

    const res = generateGroups(
      taxaNames,
      separators.length > 0 ? separators : null,
      selectedStrategy,
      options
    );

    setGroupingResult(res);

    if (res?.groups) {
      setGroups(res.groups);
      // If separators were auto-detected, update the state
      if (res.analyzed && res.separators && res.separators.length > 0) {
        setSeparators(res.separators);
      }
      setGroupColorMap((prev) => syncGroupColors(prev, res.groups));
    } else {
      setGroups([]);
    }
  }, [taxaNames, selectedStrategy, separators, segmentIndex, useRegex, regexPattern]);

  // Track previous grouping config to avoid unnecessary updateGroups calls
  const prevGroupingConfigRef = useRef(null);
  const hasGeneratedGroupsRef = useRef(false);

  // Update groups when mode changes to "groups" AND grouping config actually changed
  // Also generate groups the FIRST time we switch to groups mode
  useEffect(() => {
    if (mode !== 'groups') {
      // Reset the flag when leaving groups mode so re-entering will regenerate
      hasGeneratedGroupsRef.current = false;
      return;
    }

    // Create a config key to detect actual changes
    const configKey = JSON.stringify({
      taxaNames: taxaNames.length,
      selectedStrategy,
      separators,
      segmentIndex,
      useRegex,
      regexPattern,
    });

    // Update if config changed OR if we haven't generated groups yet for this session
    const configChanged = prevGroupingConfigRef.current !== configKey;
    const needsInitialGeneration = !hasGeneratedGroupsRef.current;

    if ((configChanged || needsInitialGeneration) && taxaNames.length > 0) {
      prevGroupingConfigRef.current = configKey;
      hasGeneratedGroupsRef.current = true;
      updateGroups();
    }
  }, [
    mode,
    taxaNames,
    selectedStrategy,
    separators,
    segmentIndex,
    useRegex,
    regexPattern,
    updateGroups,
  ]);

  const handleStrategyChange = useCallback((config) => {
    setSelectedStrategy(config.strategy);
    setSeparators(config.separators);
    setSegmentIndex(config.segmentIndex);
    setUseRegex(config.useRegex);
    setRegexPattern(config.regexPattern);
  }, []);

  const resetAll = useCallback(() => {
    setTaxaColorMap({ ...normalizedOriginal });
    setGroupColorMap({});
    setMode('taxa');
    setSelectedStrategy('prefix');
    setSeparators([]);
    setSegmentIndex(0);
    setUseRegex(false);
    setRegexPattern('');
    setGroups([]);
    setGroupingResult(null);
    resetCSV();
  }, [normalizedOriginal, resetCSV]);

  const resetToDefault = useCallback(() => {
    // Clear everything across all modes. Drop the entries rather than writing
    // SYSTEM_TREE_COLORS.defaultColor into them: an absent entry is what the
    // consumers treat as "use the system default", while an explicit black is
    // indistinguishable from a color the user chose.
    setTaxaColorMap((prev) => {
      const next = { ...prev };
      taxaNames.forEach((name) => delete next[name]);
      return next;
    });
    setGroupColorMap((prev) => {
      const next = { ...prev };
      groups.forEach((g) => delete next[g.name]);
      csvGroups.forEach((g) => delete next[g.name]);
      return next;
    });
  }, [taxaNames, groups, csvGroups]);

  const buildResult = useCallback(
    () => ({
      mode,
      taxaColorMap: toHexMap(taxaColorMap),
      groupColorMap: toHexMap(groupColorMap),
      separators: Array.isArray(separators) && separators.length > 0 ? separators : null,
      strategyType: selectedStrategy,
      segmentIndex,
      useRegex,
      regexPattern,
      groups, // Exposed for legend
      csvTaxaMap,
      csvGroups,
      csvColumn,
      csvData,
      csvFileName,
    }),
    [
      mode,
      taxaColorMap,
      groupColorMap,
      separators,
      selectedStrategy,
      segmentIndex,
      useRegex,
      regexPattern,
      groups,
      csvTaxaMap,
      csvGroups,
      csvColumn,
      csvData,
      csvFileName,
    ]
  );

  const handleColorChange = useCallback((name, color, isGroup = false) => {
    if (isGroup) {
      setGroupColorMap((prev) => ({ ...prev, [name]: color }));
    } else {
      setTaxaColorMap((prev) => ({ ...prev, [name]: color }));
    }
  }, []);

  // Snapshot exposed to the swatch grid. Its identity changes with the color
  // maps, so consumers re-render on color changes without a version counter.
  const colorManager = useMemo(
    () => ({ taxaColorMap, groupColorMap }),
    [taxaColorMap, groupColorMap]
  );

  return {
    mode,
    setMode,
    selectedStrategy,
    separators,
    segmentIndex,
    useRegex,
    regexPattern,
    groupingResult,
    handleStrategyChange,
    groups,
    csvData,
    csvFileName,
    csvGroups,
    csvColumn,
    csvValidation,
    csvError,
    colorManager,
    applyScheme,
    onFile,
    onMetadataSource,
    onColumnChange,
    resetCSV,
    resetAll,
    resetToDefault,
    buildResult,
    handleColorChange,
  };
}
