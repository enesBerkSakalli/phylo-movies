import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ColorSchemeManager } from "@/js/treeColoring/utils/ColorSchemeManager.js";
import { generateGroups } from "@/js/treeColoring/utils/GroupingUtils.js";
import { mapStrategyName } from "@/js/treeColoring/constants/Strategies.js";
import { syncGroupColors, normalizeSeparator } from "../utils/colorManagement.js";
import { useForceUpdate } from "./useForceUpdate.js";
import { useCSVState } from "./useCSVState.js";

export function useTaxaColoringState(taxaNames, originalColorMap) {
  const colorManagerRef = useRef(new ColorSchemeManager(originalColorMap));
  const force = useForceUpdate();

  const [mode, setMode] = useState("taxa");
  const [selectedStrategy, setSelectedStrategy] = useState("prefix");
  const [separators, setSeparators] = useState([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [useRegex, setUseRegex] = useState(false);
  const [regexPattern, setRegexPattern] = useState("");
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
  } = useCSVState(taxaNames);

  const mgr = colorManagerRef.current;

  const applyScheme = useCallback((id, targetMode) => {
    const itemsMap = {
      taxa: { items: taxaNames, isGrouped: false },
      groups: { items: groups, isGrouped: true },
      csv: { items: csvGroups, isGrouped: true }
    };
    const { items, isGrouped } = itemsMap[targetMode];
    mgr.applyColorScheme(id, items, isGrouped);
    force();
  }, [taxaNames, groups, csvGroups, mgr, force]);

  const updateGroups = useCallback(() => {
    const mapped = mapStrategyName(selectedStrategy);
    const options = {
      segmentIndex,
      useRegex,
      regexPattern
    };

    const res = generateGroups(taxaNames, separators.length > 0 ? separators : null, mapped, options);

    setGroupingResult(res);

    if (res?.groups) {
      setGroups(res.groups);
      // If separators were auto-detected, update the state
      if (res.analyzed && res.separators && res.separators.length > 0) {
        setSeparators(res.separators);
      }
      syncGroupColors(mgr, res.groups);
      force();
    } else {
      setGroups([]);
    }
  }, [taxaNames, selectedStrategy, separators, segmentIndex, useRegex, regexPattern, mgr, force]);

  useEffect(() => {
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
    force();
  }, [mgr, resetCSV, force]);

  const resetColorsToBlack = useCallback(() => {
    const itemsMap = {
      taxa: taxaNames.map(name => ({ name, map: mgr.taxaColorMap })),
      groups: groups.map(g => ({ name: g.name, map: mgr.groupColorMap })),
      csv: csvGroups.map(g => ({ name: g.name, map: mgr.groupColorMap }))
    };

    itemsMap[mode]?.forEach(({ name, map }) => map.set(name, "#000000"));
    force();
  }, [mode, taxaNames, groups, csvGroups, mgr, force]);

  const buildResult = useCallback(() => ({
    mode,
    taxaColorMap: mgr.taxaColorMap,
    groupColorMap: mgr.groupColorMap,
    separators: separators.length > 0 ? separators : null,
    strategyType: mapStrategyName(selectedStrategy),
    segmentIndex,
    useRegex,
    regexPattern,
    csvTaxaMap,
    csvGroups,
    csvColumn
  }), [mode, mgr, separators, selectedStrategy, segmentIndex, useRegex, regexPattern, csvTaxaMap, csvGroups, csvColumn]);

  const handleColorChange = useCallback((name, color, isGroup = false) => {
    const colorMap = isGroup ? mgr.groupColorMap : mgr.taxaColorMap;
    colorMap.set(name, color);
    force();
  }, [mgr, force]);

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
