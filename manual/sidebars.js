const sidebars = {
  manualSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Start',
      items: ['getting-started', 'usage'],
    },
    {
      type: 'category',
      label: 'Interface',
      items: ['web-interface', 'troubleshooting'],
    },
    {
      type: 'category',
      label: 'Feature Reference',
      items: [
        'feature-reference/index',
        'feature-reference/setup-and-input',
        'feature-reference/workspace-controls',
        'feature-reference/timeline-and-inspection',
        'feature-reference/msa-viewer',
        'feature-reference/taxa-coloring',
        'feature-reference/spr-analytics',
        'feature-reference/export-and-recording',
      ],
    },
  ],
};

export default sidebars;
