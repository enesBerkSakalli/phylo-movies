# scripts/quick_strip.py
import pandas as pd
import matplotlib.pyplot as plt

m = {
  'TIB_with_DEN': 2,
  'TIB_with_NEA': 1,
  'Default': 0,
  'NA': -1,
  'ERR': -2
}

df = pd.read_csv('out/epas1_windows.csv')
df['code'] = df['state'].map(m)
plt.figure(figsize=(10,1.5))
plt.imshow([df['code'].values], aspect='auto')
plt.yticks([])
plt.xticks([])
plt.title('EPAS1 rogue-taxon strip (Tibetan vs Denisovan)')
plt.tight_layout()
plt.savefig('out/epas1_strip.png', dpi=200)
print('Saved out/epas1_strip.png')