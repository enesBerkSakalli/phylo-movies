import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ColorSchemeManager } from "@/js/treeColoring/utils/ColorSchemeManager.js";
import { generateGroups } from "@/js/treeColoring/utils/GroupingUtils.js";
import { syncGroupColors, normalizeSeparator } from "../utils/colorManagement.js";
import { useCSVState } from "./useCSVState.js";

export function useTaxaColoringState(taxaNames, originalColorMap, initialStateParam = {}) {
  const initialState = initialStateParam || {};
  const colorManagerRef = useRef(new ColorSchemeManager(originalColorMap));
  const [version, setVersion] = useState(0);
  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);

  const [mode, setMode] = useState(initialState.mode || "taxa");
  const [selectedStrategy, setSelectedStrategy] = useState(initialState.strategyType || 'prefix');
  const [separators, setSeparators] = useState(initialState.separators || []);
  const [segmentIndex, setSegmentIndex] = useState(initialState.segmentIndex || 0);
  const [useRegex, setUseRegex] = useState(initialState.useRegex || false);
  const [regexPattern, setRegexPattern] = useState(initialState.regexPattern || "");
  const [groups, setGroups] = useState([]);
  const [groupingResult, setGroupingResult] = useState(null);

  const {
    csvData,
    csvGroups,
    csvTaxaMap,
    csvColumn,
    csvValidation,
    onFile,
    onColumnChange,
    resetCSV
  } = useCSVState(taxaNames, initialState);

  const mgr = colorManagerRef.current;

  // Initialize group colors from saved state if available
  // Also trigger groups regeneration if we're in groups mode with saved separators
  useEffect(() => {
    // Restore group color map
    if (initialState.groupColorMap) {
      const map = initialState.groupColorMap instanceof Map
        ? Object.fromEntries(initialState.groupColorMap)
        : initialState.groupColorMap;

      Object.entries(map).forEach(([name, color]) => {
        mgr.groupColorMap[name] = color;
      });
    }

    // If we're reopening in groups mode with saved configuration, regenerate groups
    if (initialState.mode === "groups" && taxaNames.length > 0) {
      const savedSeparators = initialState.separators;
      const options = {
        segmentIndex: initialState.segmentIndex || 0,
        useRegex: initialState.useRegex || false,
        regexPattern: initialState.regexPattern || ""
      };

      const res = generateGroups(
        taxaNames,
        savedSeparators && savedSeparators.length > 0 ? savedSeparators : null,
        initialState.strategyType || 'prefix',
        options
      );

      if (res?.groups) {
        setGroups(res.groups);
        setGroupingResult(res);
        // Sync colors: restore saved colors or generate new ones
        syncGroupColors(mgr, res.groups);
      }
    }

    forceUpdate();
  }, []); // Run once on mount

  const applyScheme = useCallback((id, targetMode) => {
    const itemsMap = {
      taxa: { items: taxaNames, isGrouped: false },
      groups: { items: groups, isGrouped: true },
      csv: { items: csvGroups, isGrouped: true }
    };
    const { items, isGrouped } = itemsMap[targetMode];
    mgr.applyColorScheme(id, items, isGrouped);
    forceUpdate();
  }, [taxaNames, groups, csvGroups, mgr, forceUpdate]);

  const updateGroups = useCallback(() => {
    const options = {
      segmentIndex,
      useRegex,
      regexPattern
    };

    const res = generateGroups(taxaNames, separators.length > 0 ? separators : null, selectedStrategy, options);

    setGroupingResult(res);

    if (res?.groups) {
      setGroups(res.groups);
      // If separators were auto-detected, update the state
      if (res.analyzed && res.separators && res.separators.length > 0) {
        setSeparators(res.separators);
      }
      syncGroupColors(mgr, res.groups);
      forceUpdate();
    } else {
      setGroups([]);
    }
  }, [taxaNames, selectedStrategy, separators, segmentIndex, useRegex, regexPattern, mgr, forceUpdate]);

  // Update groups when mode changes to "groups" (but not on initial mount - handled above)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (mode === "groups") updateGroups();
  }, [mode, updateGroups]);

  const handleStrategyChange = useCallback((config) => {
    setSelectedStrategy(config.strategy);
    setSeparators(config.separators);
    setSegmentIndex(config.segmentIndex);
    setUseRegex(config.useRegex);
    setRegexPattern(config.regexPattern);
  }, []);

  const resetAll = useCallback(() => {
    mgr.reset();
    setMode("taxa");
    setSelectedStrategy("prefix");
    setSeparators([]);
    setSegmentIndex(0);
    setUseRegex(false);
    setRegexPattern("");
    setGroups([]);
    setGroupingResult(null);
    resetCSV();
    forceUpdate();
  }, [mgr, resetCSV, forceUpdate]);

  const resetColorsToBlack = useCallback(() => {
    const itemsMap = {
      taxa: taxaNames.map(name => ({ name, map: mgr.taxaColorMap })),
      groups: groups.map(g => ({ name: g.name, map: mgr.groupColorMap })),
      csv: csvGroups.map(g => ({ name: g.name, map: mgr.groupColorMap }))
    };

    itemsMap[mode]?.forEach(({ name, map }) => map[name] = "#000000");
    forceUpdate();
  }, [mode, taxaNames, groups, csvGroups, mgr, forceUpdate]);

  const buildResult = useCallback(() => ({
    mode,
    taxaColorMap: mgr.taxaColorMap,
    groupColorMap: mgr.groupColorMap,
    separators: separators.length > 0 ? separators : null,
    strategyType: selectedStrategy,
    segmentIndex,
    useRegex,
    regexPattern,
    csvTaxaMap,
    csvGroups,
    csvColumn
  }), [mode, mgr, separators, selectedStrategy, segmentIndex, useRegex, regexPattern, csvTaxaMap, csvGroups, csvColumn]);

  const handleColorChange = useCallback((name, color, isGroup = false) => {
    const colorMap = isGroup ? mgr.groupColorMap : mgr.taxaColorMap;
    colorMap[name] = color;
    forceUpdate();
  }, [mgr, forceUpdate]);

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
    csvGroups,
    csvColumn,
    csvValidation,
    colorManager: mgr,
    applyScheme,
    onFile,
    onColumnChange,
    resetAll,
    resetColorsToBlack,
    buildResult,
    handleColorChange
  };
}
