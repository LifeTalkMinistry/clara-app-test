import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MoreHorizontal,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { getMoneyWordPictureClues } from './fourPicsOneMoneyWordPictureClues';
import { PUZZLES } from './fourPicsOneMoneyWordPuzzles';

function normalizeAnswer(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
