# react-msaview

A multiple sequence alignment viewer for React applications.

## Local Development

This is a local copy of react-msaview being used in the phylo-movies project. The main repository is at https://github.com/GMOD/react-msaview.

## Installation

In your project's package.json:

```json
"dependencies": {
  "react-msaview": "file:./react-msaview/lib"
}
```

## Usage

```javascript
import React from 'react';
import { MSAView, MSAModelF } from 'react-msaview';
import { createJBrowseTheme } from '@jbrowse/core/ui/theme';
import { ThemeProvider } from '@mui/material/styles';

function MyMSAViewer({ msaString }) {
  const theme = createJBrowseTheme();
  const model = MSAModelF().create({
    id: `msa-${Date.now()}`,
    type: 'MsaView',
    data: { msa: msaString }
  });

  // Set width to match container
  model.setWidth(800);

  return (
    <ThemeProvider theme={theme}>
      <div style={{ border: '1px solid #ccc', height: '500px' }}>
        <MSAView model={model} />
      </div>
    </ThemeProvider>
  );
}
```

For more details and API documentation, see the [official documentation](https://github.com/GMOD/react-msaview).
