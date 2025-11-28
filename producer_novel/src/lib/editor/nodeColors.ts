/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/node-colors
 * 
 * ノードタイプごとの色定義
 * ノード分類をしたブロックが色とラベルで識別できるようにする
 */

export interface NodeColorScheme {
  /** 背景色クラス */
  bgClass: string;
  /** ボーダー色クラス */
  borderClass: string;
  /** テキスト色クラス */
  textClass: string;
  /** ラベルバッジの背景色クラス */
  labelBgClass: string;
  /** ラベルバッジのテキスト色クラス */
  labelTextClass: string;
}

/**
 * ノードタイプごとの色スキーム定義
 */
const NODE_COLOR_SCHEMES: Record<string, NodeColorScheme> = {
  character: {
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    textClass: 'text-purple-800',
    labelBgClass: 'bg-purple-100',
    labelTextClass: 'text-purple-700',
  },
  location: {
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-800',
    labelBgClass: 'bg-blue-100',
    labelTextClass: 'text-blue-700',
  },
  organization: {
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-800',
    labelBgClass: 'bg-green-100',
    labelTextClass: 'text-green-700',
  },
  technology: {
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    textClass: 'text-orange-800',
    labelBgClass: 'bg-orange-100',
    labelTextClass: 'text-orange-700',
  },
  ghost: {
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    textClass: 'text-gray-800',
    labelBgClass: 'bg-gray-100',
    labelTextClass: 'text-gray-700',
  },
  episode: {
    bgClass: 'bg-pink-50',
    borderClass: 'border-pink-200',
    textClass: 'text-pink-800',
    labelBgClass: 'bg-pink-100',
    labelTextClass: 'text-pink-700',
  },
  scene: {
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    textClass: 'text-yellow-800',
    labelBgClass: 'bg-yellow-100',
    labelTextClass: 'text-yellow-700',
  },
  arc: {
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    textClass: 'text-indigo-800',
    labelBgClass: 'bg-indigo-100',
    labelTextClass: 'text-indigo-700',
  },
  motif: {
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-200',
    textClass: 'text-cyan-800',
    labelBgClass: 'bg-cyan-100',
    labelTextClass: 'text-cyan-700',
  },
  event: {
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-800',
    labelBgClass: 'bg-red-100',
    labelTextClass: 'text-red-700',
  },
  pov: {
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-200',
    textClass: 'text-violet-800',
    labelBgClass: 'bg-violet-100',
    labelTextClass: 'text-violet-700',
  },
  beat: {
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-800',
    labelBgClass: 'bg-amber-100',
    labelTextClass: 'text-amber-700',
  },
  season: {
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-800',
    labelBgClass: 'bg-emerald-100',
    labelTextClass: 'text-emerald-700',
  },
  timeline: {
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    textClass: 'text-slate-800',
    labelBgClass: 'bg-slate-100',
    labelTextClass: 'text-slate-700',
  },
  sourceRef: {
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
    textClass: 'text-teal-800',
    labelBgClass: 'bg-teal-100',
    labelTextClass: 'text-teal-700',
  },
  occupation: {
    bgClass: 'bg-lime-50',
    borderClass: 'border-lime-200',
    textClass: 'text-lime-800',
    labelBgClass: 'bg-lime-100',
    labelTextClass: 'text-lime-700',
  },
  setting: {
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-800',
    labelBgClass: 'bg-rose-100',
    labelTextClass: 'text-rose-700',
  },
  chapterLink: {
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
    textClass: 'text-sky-800',
    labelBgClass: 'bg-sky-100',
    labelTextClass: 'text-sky-700',
  },
};

/**
 * デフォルトの色スキーム
 */
const DEFAULT_COLOR_SCHEME: NodeColorScheme = {
  bgClass: 'bg-gray-50',
  borderClass: 'border-gray-200',
  textClass: 'text-gray-800',
  labelBgClass: 'bg-gray-100',
  labelTextClass: 'text-gray-700',
};

/**
 * ノードタイプから色スキームを取得
 */
export function getNodeColorScheme(nodeType: string): NodeColorScheme {
  return NODE_COLOR_SCHEMES[nodeType] || DEFAULT_COLOR_SCHEME;
}

/**
 * ノードタイプの表示名を取得
 */
export function getNodeTypeDisplayName(nodeType: string): string {
  const displayNames: Record<string, string> = {
    character: 'Character',
    location: 'Location',
    scene: 'Scene',
    technology: 'Technology',
    organization: 'Organization',
    ghost: 'Ghost',
    episode: 'Episode',
    arc: 'Arc',
    motif: 'Motif',
    event: 'Event',
    pov: 'POV',
    beat: 'Beat',
    season: 'Season',
    timeline: 'Timeline',
    sourceRef: 'Source Ref',
    occupation: 'Occupation',
    setting: 'Setting',
    chapterLink: 'Chapter Link',
  };

  return displayNames[nodeType] || nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
}

/**
 * ノードのCSSクラス名を生成
 */
export function getNodeClasses(nodeType: string): string {
  const colorScheme = getNodeColorScheme(nodeType);
  return `${colorScheme.bgClass} ${colorScheme.borderClass} ${colorScheme.textClass} ${nodeType}-node border rounded-lg p-4 my-4`;
}

/**
 * ノードラベルバッジのCSSクラス名を生成
 */
export function getNodeLabelClasses(nodeType: string): string {
  const colorScheme = getNodeColorScheme(nodeType);
  return `${colorScheme.labelBgClass} ${colorScheme.labelTextClass} px-2 py-1 rounded text-xs font-semibold`;
}

