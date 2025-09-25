export interface Lexicon {
  cultivationStages: { original: string; indianized: string }[];
  techniques: { original: string; indianized: string }[];
  names: { original: string; indianized: string }[];
  system: { original: string; indianized: string }[];
}

export interface VideoScript {
  title: string;
  script: { scene: number; visual: string; dialogue: string }[];
  veoPrompts: { scene: number; prompt: string }[];
}

export interface GeneratedText {
    lexicon: Lexicon;
    rewrittenStory: string;
}

export interface GeneratedImages {
    characterImages: string[];
    sceneImages: string[];
    characterPrompts: string[];
    scenePrompts: string[];
}