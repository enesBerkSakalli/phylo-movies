#!/bin/bash

# Script to automatically update word count in the LaTeX document
# Run this after making changes to update the word count section

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Run texcount and extract the main text word count
WORD_COUNT=$(texcount -inc main.tex | grep "Words in text:" | tail -1 | awk '{print $4}')
ABSTRACT_COUNT=$(texcount main.tex | grep "Words in text:" | awk '{print $4}')

echo "Main text word count: $WORD_COUNT"
echo "Abstract word count: $ABSTRACT_COUNT"

# Update the word count in the main.tex file
# Create a temporary file with the updated word count
sed "s/Main text: [0-9,]* words/Main text: $WORD_COUNT words/g" main.tex > main.tex.tmp
sed "s/Abstract: [0-9]* words/Abstract: $ABSTRACT_COUNT words/g" main.tex.tmp > main.tex.tmp2

# Replace the original file
mv main.tex.tmp2 main.tex
rm -f main.tex.tmp

echo "Word count updated in main.tex"
echo "Main text: $WORD_COUNT words"
echo "Abstract: $ABSTRACT_COUNT words"
