#!/usr/bin/env python3
import os, sys, json, subprocess, math
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict
import yaml
import pandas as pd
from Bio import SeqIO
from tqdm import tqdm
from utils_topology import parse_newick, rogue_state

@dataclass
class Params:
    size:int
    step:int
    min_var:int
    program:str
    model:str
    sh_alrt:int
    threads:int


def read_config(cfg_path:str):
    c=yaml.safe_load(open(cfg_path))
    params = Params(
        size=c['params']['windows']['size'],
        step=c['params']['windows']['step'],
        min_var=c['params'].get('min_var_sites',25),
        program=c['params']['tree']['program'],
        model=c['params']['tree']['model'],
        sh_alrt=int(c['params']['tree'].get('sh_alrt',0)),
        threads=int(c['params']['tree'].get('threads',2))
    )
    region = c['ref']['region']
    return c, params, region


def write_fasta(slice_dict:Dict[str,str], path:str):
    with open(path, 'w') as f:
        for name,seq in slice_dict.items():
            f.write(f">{name}\n{seq}\n")


def count_segregating(slice_dict:Dict[str,str]) -> int:
    seqs = list(slice_dict.values())
    if not seqs:
        return 0
    # Make sure all sequences have the same length
    L = min(len(s) for s in seqs)
    seqs = [s[:L] for s in seqs]

    seg = 0
    for i in range(L):
        col = [s[i].upper() for s in seqs]
        # exclude Ns and gaps
        bases = set([b for b in col if b in list("ACGT")])
        if len(bases) >= 2:
            seg += 1
    return seg


def run_tree(aln_path:str, out_prefix:str, params:Params):
    if params.program.startswith('iqtree'):
        cmd = [params.program, "-s", aln_path, "-m", params.model, "-fast", "-nt", str(params.threads), "-quiet", "-pre", out_prefix]
        if params.sh_alrt and params.sh_alrt>0:
            cmd += ["-alrt", str(params.sh_alrt)]
    elif params.program == 'fasttree':
        cmd = ["bash","-lc", f"FastTree -gtr -gamma < {aln_path} > {out_prefix}.treefile"]
    else:
        raise SystemExit("Unknown tree program")
    subprocess.check_call(cmd)
    return f"{out_prefix}.treefile"


def main():
    cfg = sys.argv[1] if len(sys.argv)>1 else 'config.yaml'
    c, P, region = read_config(cfg)
    os.makedirs('out/windows', exist_ok=True)
    # read alignment
    aln_path = 'out/consensus/epas1.aln.fa'
    recs = list(SeqIO.parse(aln_path, 'fasta'))
    names = [r.id for r in recs]
    seqs = {r.id:str(r.seq).upper() for r in recs}
    L = len(next(iter(seqs.values())))

    def slice_window(start:int, size:int):
        end = min(start+size, L)
        return {n: seqs[n][start:end] for n in names}

    windows=[]
    for start in tqdm(range(0, L - P.size + 1, P.step)):
        sl = slice_window(start, P.size)
        seg = count_segregating(sl)
        if seg < P.min_var:
            state = 'NA'
            treefile=None
        else:
            wfa = f"out/windows/w_{start:07d}.fa"
            write_fasta(sl, wfa)
            prefix = f"out/windows/w_{start:07d}"
            treefile = run_tree(wfa, prefix, P)
            try:
                tree = parse_newick(treefile)
                state = rogue_state(tree)
            except Exception as e:
                state = 'ERR'
        windows.append({
            'start_bp': start,
            'end_bp': start+P.size,
            'seg_sites': seg,
            'state': state,
            'treefile': treefile
        })

    df = pd.DataFrame(windows)
    df.to_csv('out/epas1_windows.csv', index=False)
    with open('out/epas1_windows.json','w') as f:
        json.dump(windows,f)
    print('Wrote out/epas1_windows.csv (and .json)')

if __name__=='__main__':
    main()