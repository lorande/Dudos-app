// Sistema de temas do Dudos: paletas + estilo de dados + arredondamento.

export type DiceStyle = 'symbol' | 'pips' | 'colored';

export interface Theme {
  id: string;
  name: string;
  bg: string;            // fundo do app
  surface: string;       // cards/painéis
  surfaceActive: string; // card ativo/destacado
  border: string;        // bordas
  primary: string;       // botões primários
  accent: string;        // títulos e destaques (dourado etc.)
  text: string;          // texto principal
  textMuted: string;     // texto secundário
  danger: string;        // dudar/ações destrutivas
  success: string;       // confirmações
  radius: number;        // arredondamento dos elementos
}

export const THEMES: Theme[] = [
  {
    id: 'roxo', name: 'Roxo Real',
    bg: '#1a0a2e', surface: '#2d1b4e', surfaceActive: '#3d2060', border: '#4a2e7a',
    primary: '#7c3aed', accent: '#f5c518', text: '#ffffff', textMuted: '#aaaaaa',
    danger: '#dc2626', success: '#4ade80', radius: 12,
  },
  {
    id: 'verde', name: 'Verde Cassino',
    bg: '#0b3d2e', surface: '#145a43', surfaceActive: '#1b6e52', border: '#1f8a5b',
    primary: '#1f8a5b', accent: '#f5c518', text: '#ffffff', textMuted: '#a7c3b5',
    danger: '#dc2626', success: '#86efac', radius: 12,
  },
  {
    id: 'azul', name: 'Azul Noturno',
    bg: '#0a1628', surface: '#14253f', surfaceActive: '#1d3454', border: '#2a4a72',
    primary: '#2563eb', accent: '#38bdf8', text: '#ffffff', textMuted: '#9fb3cc',
    danger: '#ef4444', success: '#4ade80', radius: 14,
  },
  {
    id: 'rubi', name: 'Rubi Cassino',
    bg: '#2a0a0a', surface: '#4a1212', surfaceActive: '#5e1a1a', border: '#7a2e2e',
    primary: '#dc2626', accent: '#fbbf24', text: '#ffffff', textMuted: '#d8a7a7',
    danger: '#b91c1c', success: '#4ade80', radius: 10,
  },
];

export const DEFAULT_THEME_ID = 'roxo';
export const DEFAULT_DICE_STYLE: DiceStyle = 'symbol';

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
