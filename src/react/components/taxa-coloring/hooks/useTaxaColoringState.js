import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ColorSchemeManager } from "@/js/treeColoring/utils/ColorSchemeManager.js";
import { generateGroups } from "@/js/treeColoring/utils/GroupingUtils.js";
import { syncGroupColors, normalizeSeparator } from "../utils/colorManagement.js";
import { useCSVState } from "./useCSVState.js";
import { rgbToHex, toHexMap } from "@/js/services/ui/colorUtils.js";


export function useTaxaColoringState(taxaNames, originalColorMap, initialStateParam = {}) {
  const initialState = initialStateParam || {};

  // Initialize ColorSchemeManager with saved colors if available
  const colorManagerRef = useRef(null);
  if (colorManagerRef.current === null) {
    const mgr = new ColorSchemeManager(originalColorMap);

    // Restore taxa colors from saved state immediately during initialization
    if (initialState.taxaColorMap) {
      const taxaMap = initialState.taxaColorMap instanceof Map
        ? Object.fromEntries(initialState.taxaColorMap)
        : initialState.taxaColorMap;
      Object.entries(taxaMap).forEach(([name, color]) => {
        mgr.taxaColorMap[name] = color;
      });
    }

    // Restore group colors from saved state immediately during initialization
    if (initialState.groupColorMap) {
      const groupMap = initialState.groupColorMap instanceof Map
        ? Object.fromEntries(initialState.groupColorMap)
        : initialState.groupColorMap;
      Object.entries(groupMap).forEach(([name, color]) => {
        mgr.groupColorMap[name] = color;
      });
    }

    colorManagerRef.current = mgr;
  }

  const [version, setVersion] = useState(0);
  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);

  const [mode, setMode] = useState(initialState.mode || "taxa");
  const [selectedStrategy, setSelectedStrategy] = useState(initialState.strategyType || 'prefix');
  const [separators, setSeparators] = useState(Array.isArray(initialState.separators) ? initialState.separators : []);
  const [segmentIndex, setSegmentIndex] = useState(initialState.segmentIndex ?? 0);
  const [useRegex, setUseRegex] = useState(initialState.useRegex ?? false);
  const [regexPattern, setRegexPattern] = useState(initialState.regexPattern || "");
  const [groups, setGroups] = useState([]);
  const [groupingResult, setGroupingResult] = useState(null);

  const {
    csvData,
    csvFileName,
    csvGroups,
    csvTaxaMap,
    csvColumn,
    csvValidation,
    onFile,
    onColumnChange,
    resetCSV
  } = useCSVState(taxaNames, initialState);

  const mgr = colorManagerRef.current;

  // Initialize groups if reopening in groups mode with saved configuration
  // Color maps are already restored during ColorSchemeManager initialization
  useEffect(() => {
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

  // Sync CSV group colors when csvGroups change (new file loaded or column changed)
  useEffect(() => {
    if (csvGroups.length > 0) {
      syncGroupColors(mgr, csvGroups);
      forceUpdate();
    }
  }, [csvGroups, mgr, forceUpdate]);

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
  }, [taxaNames, selectedStrategy, separators, segmentIndex, useRegex, regexPattern, mgr]);

  // Track previous grouping config to avoid unnecessary updateGroups calls
  const prevGroupingConfigRef = useRef(null);
  const hasGeneratedGroupsRef = useRef(false);

  // Update groups when mode changes to "groups" AND grouping config actually changed
  // Also generate groups the FIRST time we switch to groups mode
  useEffect(() => {
    if (mode !== "groups") {
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
      regexPattern
    });

    // Update if config changed OR if we haven't generated groups yet for this session
    const configChanged = prevGroupingConfigRef.current !== configKey;
    const needsInitialGeneration = !hasGeneratedGroupsRef.current;

    if ((configChanged || needsInitialGeneration) && taxaNames.length > 0) {
      prevGroupingConfigRef.current = configKey;
      hasGeneratedGroupsRef.current = true;
      updateGroups();
    }
  }, [mode, taxaNames, selectedStrategy, separators, segmentIndex, useRegex, regexPattern, updateGroups]);

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

  const resetToDefault = useCallback(function resetToDefault() {
    // Clear everything across all modes - reset to standard system default
    const defaultColor = "#000000";
    taxaNames.forEach(name => { mgr.taxaColorMap[name] = defaultColor; });
    groups.forEach(g => { mgr.groupColorMap[g.name] = defaultColor; });
    csvGroups.forEach(g => { mgr.groupColorMap[g.name] = defaultColor; });

    forceUpdate();
  }, [taxaNames, groups, csvGroups, mgr, forceUpdate]);

  const buildResult = useCallback(() => ({
    mode,
    taxaColorMap: toHexMap(mgr.taxaColorMap),
    groupColorMap: toHexMap(mgr.groupColorMap),
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
    csvFileName
  }), [mode, mgr, separators, selectedStrategy, segmentIndex, useRegex, regexPattern, groups, csvTaxaMap, csvGroups, csvColumn, csvData, csvFileName, version]);

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
    csvFileName,
    csvGroups,
    csvColumn,
    csvValidation,
    colorManager: mgr,
    colorVersion: version, // Expose version to force re-renders in child components
    applyScheme,
    onFile,
    onColumnChange,
    resetCSV,
    resetAll,
    resetToDefault,
    buildResult,
    handleColorChange
  };
}
