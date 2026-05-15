# UI Design & Implementation Standards

This document outlines the visual and architectural standards for the PhyloMovies project. All new components and refactors must adhere to these guidelines to ensure consistency, accessibility, and high performance in our high-density data visualization environment.

---

## 1. Core Architectural Pillars

### A. Shadcn/UI Component Usage

- **Modification over Wrapping**: Do not create "wrapper" components for Shadcn. If you need a custom version of a `Button`, add a new variant (using `cva`) directly in `src/components/ui/button.jsx`.
- **Composition over Props**: Use the primitive components provided by Radix/Shadcn to build complex layouts. Avoid "Mega-Props" that pass down too many configuration objects.
- **Accessibility**: Use Shadcn `<Label />`, `<Separator />`, and `<Tooltip />` to ensure correct ARIA roles and keyboard navigation.

### B. State Management (Zustand)

- **Selector Isolation**: Define selectors as named constants outside the component to prevent unnecessary re-renders.

  ```javascript
  // ✅ DO
  const selectData = (state) => state.data;
  const MyComponent = () => {
    const data = useStore(selectData);
    return <div>{data}</div>;
  };
  ```

- **Action Decoupling**: View components should trigger actions, not perform complex state transitions or calculations internally.

---

## 2. Visual Antipatterns (Detailed Breakdown)

Visual antipatterns are common design "solutions" that initially seem helpful but ultimately degrade usability, accessibility, or visual clarity. In a data-heavy application like **PhyloMovies**, these are particularly dangerous because they distract from the actual data (the tree/MSA).

### 1. The "Wall of Controls" (Information Overload)

*   **The Pattern**: Placing 20+ buttons and sliders in a single panel without grouping or hierarchy.
*   **The Problem**: Users suffer from **choice paralysis**. It's hard to distinguish "global" settings (like Tree Layout) from "local" ones (like Font Size).
*   **The Fix**: Use **Shadcn Tabs**, **Accordions**, or **Separators** to create logical buckets. Hide advanced settings behind a "More" toggle.

### 2. "Border-itis" (Lack of Whitespace)

*   **The Pattern**: Using thin gray borders around every single div, button, and input field to separate them.
*   **The Problem**: It creates **visual noise**. The human eye sees every border as a "line" to process.
*   **The Fix**: Use **Whitespace (padding/margins)** and **Background Tinting** (subtle grays) instead of lines. A change in background color is often a cleaner way to define a section than a border.

### 3. "Semantic Color Abuse"

*   **The Pattern**: Using Red for "Deletion," but also using Red because it "looks good" for a specific taxon, or using Blue for "Information" but also for "Selected."
*   **The Problem**: It confuses the user's "reptilian brain." If a user sees Red, they think "Error" or "Danger." If a branch is red just because it's in a specific subtree, they might think the data is broken.
*   **The Fix**: Reserve semantic colors (Red, Green, Yellow) strictly for **state feedback** (Errors, Success, Warnings). Use a separate, neutral palette for data categories.

### 4. Spacing "Drift"

*   **The Pattern**: One component has `p-4` (1rem), another has `p-5` (1.25rem), and another has manual `padding: 18px`.
*   **The Problem**: It makes the UI feel "jittery" or unprofessional. The eye expects a **rhythm**. Even a 2px difference in alignment is perceivable and causes subtle mental fatigue.
*   **The Fix**: Stick strictly to a **4-pixel grid** (Tailwind’s default). Only use `p-1, p-2, p-4, p-8`, etc. Never use arbitrary pixel values.

### 5. "Zombie" Interactive Elements

*   **The Pattern**: Showing a button (like "Download CSV") even when no file is uploaded, and either doing nothing when clicked or showing an alert.
*   **The Problem**: It breaks the **mental model** of what is possible.
*   **The Fix**: **Disable** (`opacity-50 pointer-events-none`) or **Hide** elements that aren't currently actionable.

### 6. The "Searchlight" Effect (Contrast Overload)

*   **The Pattern**: Having a pure black background with pure white text and neon-bright buttons.
*   **The Problem**: It causes **eye strain** during long research sessions. High contrast is good for visibility, but *too much* contrast is vibrating.
*   **The Fix**: Use "Zinc" or "Slate" grays (e.g., `bg-zinc-950` instead of `bg-black`) and "Muted" text colors (`text-zinc-400`) for secondary information.

### 7. The "Hidden Affordance"

*   **The Pattern**: Making a label or a text string clickable without any visual cue (like an icon, underline, or color change).
*   **The Problem**: Users don't know they *can* interact with it. They have to "mine-sweep" with their mouse.
*   **The Fix**: Use **Shadcn Tooltips** or consistent chevron icons ($\downarrow$) to indicate that a menu exists or an item is interactive.

### 8. "Consumer Drift" (Non-Scientific Stylization)

*   **The Pattern**: Using high-radius rounded corners (`rounded-2xl`, `rounded-full`), playful "bubbly" animations, or consumer-grade icons (like a "Heart" for favorites or a "Shopping Cart" for data).
*   **The Problem**: It erodes the **scientific authority** of the tool. Researchers expect a professional, precise environment like it7 or Seurat, not a social media dashboard.
*   **The Fix**: Use standard professional radiuses (`rounded-md`, `rounded-sm`). Prefer **Lucide** icons with a technical theme (`Activity`, `Zap`, `Binary`, `Fingerprint`).

### 9. "Aesthetic Data Obfuscation" (Incorrect Simplification)

*   **The Pattern**: Truncating decimal points (e.g., `0.0001` -> `0.0`) or hiding "ugly" metadata like bootstrap values or node IDs to make the UI look "clean."
*   **The Problem**: In phylogenetics, the "ugly" numbers ARE the data. Hiding them for aesthetics is a **scientific error**.
*   **The Fix**: Use **Tooltips** or **Detailed Stats Panels** to show full precision. Never hide mathematical reality for the sake of a "clean" UI layout. Use **tabular-nums** to keep numbers readable even at high precision.

### 10. "Progress-Time Paradox" (Linearity Assumption)

*   **The Pattern**: Using a traditional "Time Remaining" (e.g., `00:45 left`) or a linear percentage bar to represent a complex topological morph.
*   **The Problem**: In scientific computing, especially tree interpolation, different steps have different computational and geometric weights. A linear "time" indicator is factually incorrect as it assumes constant velocity through tree space.
*   **The Fix**: Use **Interpolation Coordinates (0.00-1.00)** or **Step Indices (Step 4 of 12)**. This communicates a sequence of logical states rather than a chronological duration.

### 11. "The Simplification Trap" (Data-Ink Reduction)

*   **The Pattern**: Removing "clutter" like scientific grid lines, scale bars, or precise decimal readouts to achieve a "clean" Apple-style aesthetic.
*   **The Problem**: This violates the **Tufte Principal of Data-Ink Ratio**. In a scientific tool, the "clutter" is often the validation for the results. A scale bar isn't a UI element; it's a measurement tool.
*   **The Fix**: Use **Layered Information**. Keep the high-precision data visible by default, but use low-contrast colors or smaller font sizes (`text-[10px]`) so it doesn't distract from the primary shapes.

---

## 3. The "Golden Standard" Component
Example of a perfectly structured high-density control component:

```jsx
import React from 'react';
import { useAppStore } from '../../state/phyloStore/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Settings2 } from 'lucide-react';

// 1. Logic-free Selectors
const selectSettings = (s) => s.settings;
const selectSetSettings = (s) => s.setSettings;

const SettingsPanel = () => {
  const settings = useAppStore(selectSettings);
  const setSettings = useAppStore(selectSetSettings);

  return (
    <Card className="border-none shadow-none bg-zinc-900/50">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-zinc-400" />
          Visualization Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Use Separators instead of borders */}
        <Separator className="bg-white/5" />

        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            {/* Shadcn Label vs raw <label> */}
            <Label htmlFor="node-size" className="text-xs text-muted-foreground">
              Node Scale
            </Label>
            {/* Component logic kept separate from UI layout */}
            <input
              id="node-size"
              type="range"
              disabled={!settings.isLoaded}
              className="accent-primary"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
```

---

## 4. Performance & Responsiveness
- **High-Density Density**: Use "compact" variants for toolbars. In the main tree view, vertical space is a premium.
- **Dynamic Feedback**: Use `Toaster` or `Sonner` for async feedback (like CSV upload success) rather than manual text states.
- **SVG over PNG**: Use `Lucide` icons exclusively for scalability and CSS color integration.

---

## 5. Scientific Domain Logic & Naming

PhyloMovies is a **scientific phylogenetic tool**, not a consumer media player or a marketing dashboard. The UI naming and logic must reflect the mathematical and biological reality of the data.

### A. Avoid "Marketing" & "Advertising" Terminology

- **No "Progress" for State**: Scientific data doesn't "progress" like a download or a video. It has an **Interpolation Coordinate** or a **Temporal State**.
    - ❌ "75% Progress" → ✅ "Interpolation: 0.75" or "Path State: 75%"
- **Context over Content**: The coordinate reflects the current position on the **Path between Trees**. Do not treat it as a playback percentage.
- **Precision over Simplicity**: Do not use "dumbed down" terms. Use specific phylogenetic terms:
    - ❌ "Main View" → ✅ "Primary View" or "Topological Reference"
    - ❌ "Movie Speed" → ✅ "Temporal Scaling" or "Transition Rate"
    - ❌ "Tree Difference" → ✅ "Topological Distance" (RF/wRF)
- **Misleading Metaphors**: Avoid consumer metaphors that imply an incorrect physical reality.
    - ❌ "Video Player" → ✅ "Transition Viewer" or "Morph Orchestrator"
    - ❌ "Loop" → ✅ "Cyclic Iteration" (if used in a technical context)

### B. Respecting Mathematical Reality

- **Subtree vs Clade**: Always use **Subtree** for topological units and rearrangement analytics. A **Subtree** is defined by a unique set of taxa (leaves). Do not use "Clade" in the UI labels when referring to structural units; "Subtree" correctly describes the units being manipulated and relocated by the BranchArchitect engine.
- **Mobility vs Jump**: Use **Mobility** or **Rearrangement** to describe the movement of subtrees. A "Jump" is the specific event where a subtree's logical attachment point changes between tree states.
- **Substitution Rate & Phylogenetic Scale**: Visual labels must reflect the underlying metrics. A scale of `10.000` is a **Substitution Rate** or **Phylogenetic Scale**, not simply a "Session Scale".
- **Coordinate Consistency**: Coordinates in the UI should be presented as mathematical factors (0.0 - 1.0) or clearly labeled interpolation states.
- **Tabular Data**: Use **tabular-nums** for coordinates and distances to prevent layout shift during state changes.

### C. The "Mental Model"

Scientists look for **transitions** and **anchors**. The UI should emphasize the relationship between trees (the "Morph") as a traversal through tree space. Every visual change is a mapping of taxa between different topological configurations.

### E. The Simplification Trap

Avoid removing parameters that provide expert context. A scientist would rather see a raw "Magnitude Factor: 0.82" than a "Zoom: High". The former is a mathematical property of the layout; the latter is a subjective interpretation.

## 6. Technical Engineering Standards

### A. Component Integrity (React Refs)

To support the high-density complexity of control panels (e.g., `AnalyticsDashboard`), all UI primitives in `src/components/ui/` must implement `React.forwardRef`. This is critical for compatibility with the Radix `asChild` pattern (Slot) used in Dialogs, Tooltips, and Sidebars.

**Requirement**: Never export a functional component for a UI primitive that might be wrapped in another interactive component without `forwardRef`.

### B. State Nomenclature

Internal state variables must reflect the scientific intent.
- `progress` -> `interpolationState` or `coordinate`
- `zoom` -> `magnitude` or `scale`
- `node` -> `vertex` (if in graph context) or `branchingPoint`

## 7. Audit Checklist (Scientific Review)
- [x] Are all percentages based on total possible state (Magnitude vs Coordinate)?
- [x] Is the data displayed using `tabular-nums` for alignment?
- [x] Have all ambiguous biological terms ("Clade") been replaced with structural terms ("Subtree")?
- [x] Do all interactive elements pass refs correctly to the DOM for focus management?
- [x] Is "Time" strictly excluded from the visualization logic?
