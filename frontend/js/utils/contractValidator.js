/**
 * Contract Validator - Ensures backend-frontend data contract compliance
 * 
 * This utility validates that data from the backend meets the expected
 * structure and relationships required by the frontend visualization.
 */

export class BackendContractValidator {
    constructor(options = {}) {
        this.strict = options.strict || false;
        this.logLevel = options.logLevel || 'warn'; // 'error', 'warn', 'info', 'debug'
    }

    /**
     * Validates the complete dataset from backend
     * @param {Object} data - Complete dataset from backend
     * @param {Array} data.treeList - Array of interpolated trees
     * @param {Array} data.treeNames - Array of tree names
     * @param {Array} data.robinsonFouldsDistances - RFD distance array
     * @param {Array} data.weightedRobinsonFouldsDistances - Weighted RFD array
     * @param {Object} data.highlightData - Highlighting/jumping taxa data
     * @param {Array} data.scaleList - Scale values array
     * @returns {Object} Validation result with issues and recommendations
     */
    validateCompleteDataset(data) {
        const issues = [];
        const warnings = [];
        const recommendations = [];

        // 1. Basic structure validation
        if (!data.treeList || !Array.isArray(data.treeList)) {
            issues.push('TreeList is missing or not an array');
            return { isValid: false, issues, warnings, recommendations };
        }

        if (!data.treeNames || !Array.isArray(data.treeNames)) {
            issues.push('TreeNames is missing or not an array');
            return { isValid: false, issues, warnings, recommendations };
        }

        // 2. Array length consistency validation
        const treeCount = data.treeList.length;
        const nameCount = data.treeNames.length;

        if (treeCount !== nameCount) {
            issues.push(`Tree count mismatch: ${treeCount} trees vs ${nameCount} names`);
        }

        // 3. Tree naming pattern validation
        const treeNamePatterns = this.validateTreeNamingPatterns(data.treeNames);
        if (!treeNamePatterns.isValid) {
            issues.push(...treeNamePatterns.issues);
            warnings.push(...treeNamePatterns.warnings);
        }

        // 4. Distance array validation (use full tree count, not interpolated count)
        const distanceValidation = this.validateDistanceArrays(data, treeCount, treeNamePatterns.fullTreeCount);
        if (!distanceValidation.isValid) {
            issues.push(...distanceValidation.issues);
            warnings.push(...distanceValidation.warnings);
        }

        // 5. Highlight data validation
        if (data.highlightData) {
            const highlightValidation = this.validateHighlightData(data.highlightData, treeNamePatterns.fullTreeCount);
            if (!highlightValidation.isValid) {
                issues.push(...highlightValidation.issues);
                warnings.push(...highlightValidation.warnings);
            }
        }

        // 6. Scale data validation
        if (data.scaleList) {
            const scaleValidation = this.validateScaleData(data.scaleList, treeCount);
            if (!scaleValidation.isValid) {
                issues.push(...scaleValidation.issues);
                warnings.push(...scaleValidation.warnings);
            }
        }

        // 7. Interpolation quality validation
        const interpolationValidation = this.validateInterpolationQuality(data.treeNames, treeNamePatterns.fullTreeIndices);
        warnings.push(...interpolationValidation.warnings);
        recommendations.push(...interpolationValidation.recommendations);

        const isValid = issues.length === 0;
        
        this.logValidationResults({ isValid, issues, warnings, recommendations });

        return {
            isValid,
            issues,
            warnings,
            recommendations,
            summary: this.generateValidationSummary({ isValid, issues, warnings, recommendations })
        };
    }

    /**
     * Validates tree naming patterns and extracts tree type information
     */
    validateTreeNamingPatterns(treeNames) {
        const issues = [];
        const warnings = [];
        const fullTreeIndices = [];
        const intermediateTreeIndices = [];
        const consensusTreeIndices = [];

        treeNames.forEach((name, index) => {
            if (/^T\d+$/.test(name)) {
                fullTreeIndices.push(index);
            } else if (/^IT\d*$/.test(name)) {
                intermediateTreeIndices.push(index);
            } else if (/^C_\d+$/.test(name)) {
                consensusTreeIndices.push(index);
            } else {
                warnings.push(`Unrecognized tree name pattern: "${name}" at index ${index}`);
            }
        });

        // Validate full tree sequence
        if (fullTreeIndices.length === 0) {
            issues.push('No full trees (T pattern) found in tree names');
        } else {
            // Check if full tree numbering is consecutive
            const fullTreeNumbers = fullTreeIndices.map(i => {
                const match = treeNames[i].match(/^T(\d+)$/);
                return match ? parseInt(match[1], 10) : -1;
            });
            
            for (let i = 0; i < fullTreeNumbers.length - 1; i++) {
                if (fullTreeNumbers[i + 1] !== fullTreeNumbers[i] + 1) {
                    warnings.push(`Non-consecutive full tree numbering: T${fullTreeNumbers[i]} followed by T${fullTreeNumbers[i + 1]}`);
                }
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            warnings,
            fullTreeIndices,
            fullTreeCount: fullTreeIndices.length,
            intermediateTreeIndices,
            consensusTreeIndices
        };
    }

    /**
     * Validates distance arrays have correct lengths and relationships
     * Distance arrays represent transitions between ORIGINAL trees, not interpolated trees
     */
    validateDistanceArrays(data, treeCount, fullTreeCount) {
        const issues = [];
        const warnings = [];
        
        // Distance arrays should have length = (number of original trees - 1)
        // NOT (interpolated trees - 1)
        const expectedDistanceLength = fullTreeCount > 0 ? fullTreeCount - 1 : 0;

        if (data.robinsonFouldsDistances) {
            if (data.robinsonFouldsDistances.length !== expectedDistanceLength) {
                // Only flag as error if the difference is significant
                if (Math.abs(data.robinsonFouldsDistances.length - expectedDistanceLength) > 5) {
                    issues.push(`RFD array length mismatch: expected ${expectedDistanceLength} (original tree transitions), got ${data.robinsonFouldsDistances.length}`);
                } else {
                    warnings.push(`Minor RFD array length difference: expected ${expectedDistanceLength}, got ${data.robinsonFouldsDistances.length}`);
                }
            }
        }

        if (data.weightedRobinsonFouldsDistances) {
            if (data.weightedRobinsonFouldsDistances.length !== expectedDistanceLength) {
                // Only flag as error if the difference is significant  
                if (Math.abs(data.weightedRobinsonFouldsDistances.length - expectedDistanceLength) > 5) {
                    issues.push(`Weighted RFD array length mismatch: expected ${expectedDistanceLength} (original tree transitions), got ${data.weightedRobinsonFouldsDistances.length}`);
                } else {
                    warnings.push(`Minor Weighted RFD array length difference: expected ${expectedDistanceLength}, got ${data.weightedRobinsonFouldsDistances.length}`);
                }
            }
        }

        // Check for reasonable distance values
        if (data.robinsonFouldsDistances) {
            const invalidRfd = data.robinsonFouldsDistances.filter(d => d < 0 || d > 1 || isNaN(d));
            if (invalidRfd.length > 0) {
                warnings.push(`${invalidRfd.length} invalid RFD values (should be 0-1)`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            warnings
        };
    }

    /**
     * Validates highlight/jumping taxa data structure
     */
    validateHighlightData(highlightData, fullTreeCount) {
        const issues = [];
        const warnings = [];
        const expectedHighlightLength = Math.max(0, fullTreeCount - 1);

        if (highlightData.jumping_taxa) {
            if (highlightData.jumping_taxa.length !== expectedHighlightLength) {
                issues.push(`Jumping taxa length mismatch: expected ${expectedHighlightLength}, got ${highlightData.jumping_taxa.length}`);
            }
        }

        if (highlightData.s_edges) {
            if (highlightData.s_edges.length !== expectedHighlightLength) {
                issues.push(`S-edges length mismatch: expected ${expectedHighlightLength}, got ${highlightData.s_edges.length}`);
            }
        }

        if (highlightData.covers) {
            if (highlightData.covers.length !== expectedHighlightLength) {
                issues.push(`Covers length mismatch: expected ${expectedHighlightLength}, got ${highlightData.covers.length}`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            warnings
        };
    }

    /**
     * Validates scale data consistency
     */
    validateScaleData(scaleList, treeCount) {
        const issues = [];
        const warnings = [];

        if (!Array.isArray(scaleList)) {
            issues.push('Scale list is not an array');
            return { isValid: false, issues, warnings };
        }

        if (scaleList.length !== treeCount) {
            issues.push(`Scale list length mismatch: expected ${treeCount}, got ${scaleList.length}`);
        }

        // Check scale value validity
        const invalidScales = scaleList.filter(scale => 
            !scale || typeof scale.value !== 'number' || scale.value < 0 || isNaN(scale.value)
        );
        
        if (invalidScales.length > 0) {
            warnings.push(`${invalidScales.length} invalid scale values found`);
        }

        return {
            isValid: issues.length === 0,
            issues,
            warnings
        };
    }

    /**
     * Validates interpolation quality and spacing
     */
    validateInterpolationQuality(treeNames, fullTreeIndices) {
        const warnings = [];
        const recommendations = [];

        if (fullTreeIndices.length < 2) {
            return { warnings, recommendations };
        }

        // Check interpolation spacing consistency
        const spacings = [];
        for (let i = 1; i < fullTreeIndices.length; i++) {
            spacings.push(fullTreeIndices[i] - fullTreeIndices[i - 1]);
        }

        const minSpacing = Math.min(...spacings);
        const maxSpacing = Math.max(...spacings);
        const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;

        if (minSpacing < 3) {
            warnings.push(`Very sparse interpolation detected (minimum ${minSpacing} trees between full trees)`);
            recommendations.push('Consider increasing interpolation density for smoother animations');
        }

        if (maxSpacing - minSpacing > 5) {
            warnings.push(`Inconsistent interpolation spacing: varies from ${minSpacing} to ${maxSpacing}`);
            recommendations.push('Backend interpolation algorithm may need tuning for consistency');
        }

        if (avgSpacing > 20) {
            warnings.push(`Very dense interpolation detected (average ${avgSpacing.toFixed(1)} trees between full trees)`);
            recommendations.push('Consider reducing interpolation density for better performance');
        }

        return { warnings, recommendations };
    }

    /**
     * Logs validation results based on configured log level
     */
    logValidationResults(results) {
        const { isValid, issues, warnings, recommendations } = results;

        if (!isValid && (this.logLevel === 'error' || this.logLevel === 'warn' || this.logLevel === 'info' || this.logLevel === 'debug')) {
            console.error('[ContractValidator] Validation failed:', issues);
        }

        if (warnings.length > 0 && (this.logLevel === 'warn' || this.logLevel === 'info' || this.logLevel === 'debug')) {
            console.warn('[ContractValidator] Validation warnings:', warnings);
        }

        if (recommendations.length > 0 && (this.logLevel === 'info' || this.logLevel === 'debug')) {
            console.info('[ContractValidator] Recommendations:', recommendations);
        }

        if (this.logLevel === 'debug') {
            console.debug('[ContractValidator] Complete validation results:', results);
        }
    }

    /**
     * Generates a human-readable validation summary
     */
    generateValidationSummary(results) {
        const { isValid, issues, warnings, recommendations } = results;
        
        if (isValid && warnings.length === 0) {
            return 'Backend-frontend contract fully compliant ✓';
        } else if (isValid) {
            return `Contract compliant with ${warnings.length} warning(s) ⚠`;
        } else {
            return `Contract validation failed with ${issues.length} error(s) and ${warnings.length} warning(s) ✗`;
        }
    }
}

/**
 * Quick validation function for common use cases
 */
export function validateBackendData(data, options = {}) {
    const validator = new BackendContractValidator(options);
    return validator.validateCompleteDataset(data);
}

export default BackendContractValidator;