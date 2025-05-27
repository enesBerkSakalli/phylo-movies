export function logEmbeddingEnhanced(embedding) {
  if (!embedding || !embedding.length) {
    console.log(
      "%c[Embedding] No embedding data found.",
      "color: #e53935; font-weight: bold;"
    );
    return;
  }
  const xs = embedding.map((p) => p.x);
  const ys = embedding.map((p) => p.y);
  const zs = embedding.map((p) => p.z ?? 0);
  const stats = (arr) => ({
    min: Math.min(...arr),
    max: Math.max(...arr),
    mean: arr.reduce((a, b) => a + b, 0) / arr.length,
    std: Math.sqrt(
      arr.reduce(
        (a, b) =>
          a + Math.pow(b - arr.reduce((a, b) => a + b, 0) / arr.length, 2),
        0
      ) / arr.length
    ),
    range: Math.max(...arr) - Math.min(...arr),
  });

  const xStats = stats(xs);
  const yStats = stats(ys);
  const zStats = stats(zs);

  console.log(
    "%c[Embedding Stats]%c\nX: %cmin:%f max:%f mean:%f std:%f range:%f\n%cY: %cmin:%f max:%f mean:%f std:%f range:%f\n%cZ: %cmin:%f max:%f mean:%f std:%f range:%f",
    "color: #1976d2; font-weight: bold;",
    "",
    "color: #388e3c;",
    xStats.min,
    xStats.max,
    xStats.mean,
    xStats.std,
    xStats.range,
    "color: #fbc02d;",
    yStats.min,
    yStats.max,
    yStats.mean,
    yStats.std,
    yStats.range,
    "color: #d32f2f;",
    zStats.min,
    zStats.max,
    zStats.mean,
    zStats.std,
    zStats.range
  );

  // Preview first 5 points
  console.log(
    "%c[Embedding Preview]%c (first 5 points):",
    "color: #1976d2; font-weight: bold;",
    ""
  );
  embedding.slice(0, 5).forEach((p, i) => {
    console.log(
      `%c#${i}: x=%f, y=%f, z=%f`,
      "color: #607d8b;",
      p.x,
      p.y,
      p.z ?? 0
    );
  });

  if (embedding.length <= 100) {
    let grid = Array(10)
      .fill()
      .map(() => Array(20).fill(" "));
    const minX = xStats.min,
      maxX = xStats.max,
      minY = yStats.min,
      maxY = yStats.max;
    embedding.forEach((p) => {
      const gx = Math.floor(((p.x - minX) / (maxX - minX + 1e-9)) * 19);
      const gy = Math.floor(((p.y - minY) / (maxY - minY + 1e-9)) * 9);
      if (gx >= 0 && gx < 20 && gy >= 0 && gy < 10) grid[9 - gy][gx] = "•";
    });
    console.log(
      "%c[Embedding 2D Preview]",
      "color: #1976d2; font-weight: bold;"
    );
    grid.forEach((row) => console.log(row.join("")));
  }
}