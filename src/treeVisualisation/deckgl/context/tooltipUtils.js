import { getGroupForTaxon } from '../../../treeColoring/utils/GroupingUtils.js';

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function createTaxonTooltip(info, taxaGrouping) {
  const obj = info?.object;
  if (!obj) return null;

  const taxonName = obj.text || obj.name;
  if (!taxonName) return null;

  const tooltipLines = [taxonName];

  if (taxaGrouping) {
    const taxonInfo = getAllTaxonInfo(taxonName, taxaGrouping);

    for (const [key, value] of Object.entries(taxonInfo)) {
      if (value != null) {
        tooltipLines.push(`${key}: ${value}`);
      }
    }
  }

  return {
    html: formatTooltipHtml(tooltipLines),
    style: {
      fontSize: '11px',
      padding: '6px 10px',
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: '#fff',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      maxWidth: '300px',
    },
  };
}

export function escapeTooltipHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function formatTooltipHtml(lines) {
  if (lines.length === 0) return '';

  const [title, ...details] = lines;
  let html = `<div style="font-weight: 600; margin-bottom: ${details.length ? '4px' : '0'}; font-size: 12px;">${escapeTooltipHtml(title)}</div>`;

  if (details.length > 0) {
    html += '<div style="font-size: 10px; opacity: 0.9; line-height: 1.4;">';
    html += details
      .map((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1).trim();
          return `<div><span style="opacity: 0.7;">${escapeTooltipHtml(key)}:</span> ${escapeTooltipHtml(value)}</div>`;
        }
        return `<div>${escapeTooltipHtml(line)}</div>`;
      })
      .join('');
    html += '</div>';
  }

  return html;
}

function getAllTaxonInfo(taxonName, taxaGrouping) {
  if (!taxaGrouping) return {};

  const {
    mode,
    separators,
    strategyType,
    segmentIndex,
    useRegex,
    regexPattern,
    csvTaxaMap,
    csvData,
    csvColumn,
  } = taxaGrouping;
  const info = {};

  if (mode === 'taxa') {
    return info;
  }

  if (mode === 'csv') {
    if (csvData?.taxaData) {
      let taxonData;
      if (csvData.taxaData instanceof Map) {
        taxonData = csvData.taxaData.get(taxonName);
      } else if (typeof csvData.taxaData === 'object') {
        taxonData = csvData.taxaData[taxonName];
      }

      if (taxonData && typeof taxonData === 'object') {
        for (const [colName, value] of Object.entries(taxonData)) {
          info[colName] = value;
        }
      }
    } else if (csvTaxaMap) {
      let groupValue;
      if (csvTaxaMap instanceof Map) {
        groupValue = csvTaxaMap.get(taxonName);
      } else if (typeof csvTaxaMap === 'object') {
        groupValue = csvTaxaMap[taxonName];
      }
      if (groupValue) {
        info[csvColumn || 'Group'] = groupValue;
      }
    }
    return info;
  }

  if (mode === 'groups') {
    const options = { segmentIndex, useRegex, regexPattern };
    const groupName = getGroupForTaxon(taxonName, separators, strategyType, options);
    if (groupName) {
      info.Group = groupName;
      if (strategyType) {
        info.Strategy = strategyType;
      }
    }
    return info;
  }

  return info;
}
