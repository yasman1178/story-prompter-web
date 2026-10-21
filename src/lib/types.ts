export type TransitionTypeId = "ZOOM_IN" | "FLASH_CUT" | "SMOOTH_FADE";

export interface TransitionType {
  id: TransitionTypeId;
  labelAr: string;
}

export const TRANSITION_TYPES: TransitionType[] = [
  { id: "ZOOM_IN", labelAr: "تكبير سينمائي (Zoom In)" },
  { id: "FLASH_CUT", labelAr: "وميض ناري (Flash Cut)" },
  { id: "SMOOTH_FADE", labelAr: "تلاشي ناعم (Smooth Fade)" },
];

export type CameraMotionType = "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "shake" | "static";
export type TransitionOutType = "cut" | "flash" | "glitch" | "fade" | "whip";
export type ForegroundAnimationType = "floating" | "pulse" | "shake" | "scale_up" | "static";

export interface BeatItem {
  atSec: number;
  visualChange: string;
}

export interface ShotSfxItem {
  sfxName: string;
  sfxVolumePercent: number;
  sfxTriggerSec: number;
}

export interface CharacterBibleItem {
  id: string;
  name: string;
  descriptionEn: string;
  referenceImage?: string;
}

export interface SeriesMeta {
  seriesName: string;
  episodeNumber: number;
  chaptersCovered: number[];
  nextEpisodeTeaser: string;
}

export type SceneArtType =
  | "DAGGER_TREMBLING"
  | "DUNGEON_FIRMED"
  | "SEIF_COFFEE_SMILE"
  | "UNCLE_KAMAL_LAUGH"
  | "HOSPITAL_BILL_EMOTIONAL"
  | "SALMA_EMERALD_HEAL"
  | "CAPTAIN_SABER_GATE"
  | "FIRST_STEP_INTO_PORTAL"
  | "DUNGEON_MARCH"
  | "DOUBLE_DUNGEON_RUNES"
  | "THE_VOTE_HAND_UP"
  | "TEMPLE_COLOSSAL_STATUES"
  | "STONE_DOOR_SLAM_SHOCK"
  | "THRONE_STATUE_RED_EYES"
  | "SEIF_DUCK_WARNING";

export const SCENE_ART_TYPES: SceneArtType[] = [
  "DAGGER_TREMBLING",
  "DUNGEON_FIRMED",
  "SEIF_COFFEE_SMILE",
  "UNCLE_KAMAL_LAUGH",
  "HOSPITAL_BILL_EMOTIONAL",
  "SALMA_EMERALD_HEAL",
  "CAPTAIN_SABER_GATE",
  "FIRST_STEP_INTO_PORTAL",
  "DUNGEON_MARCH",
  "DOUBLE_DUNGEON_RUNES",
  "THE_VOTE_HAND_UP",
  "TEMPLE_COLOSSAL_STATUES",
  "STONE_DOOR_SLAM_SHOCK",
  "THRONE_STATUE_RED_EYES",
  "SEIF_DUCK_WARNING",
];

export type BgmCategoryId = "EPIC" | "SUSPENSE" | "DRAMA" | "COMEDY" | "FANTASY";

export interface BgmCategory {
  id: BgmCategoryId;
  labelAr: string;
}

export const BGM_CATEGORIES: BgmCategory[] = [
  { id: "EPIC", labelAr: "حماسي وأكشن" },
  { id: "SUSPENSE", labelAr: "رعب وغموض" },
  { id: "DRAMA", labelAr: "درامي ومؤثر" },
  { id: "COMEDY", labelAr: "كوميدي وخفيف" },
  { id: "FANTASY", labelAr: "سحر وخيال" },
];

export interface BgmTrack {
  id: number;
  titleAr: string;
  titleEn: string;
  category: BgmCategoryId;
  description: string;
  baseFreq: number;
  tempoBpm: number;
  synthPattern: number;
  assetFileName?: string;
}

export type AspectRatioType = "9:16" | "16:9" | "1:1";

export type VfxPresetId = "action" | "mystery" | "subtle" | "custom";

export interface VfxSettings {
  parallaxDepth: number;     // 0 - 100
  dynamicRelighting: number; // 0 - 100
  runeParticles: number;     // 0 - 100
  motionIntensity: number;   // 0 - 100
  preset: VfxPresetId;
}

export interface OverlayPosition {
  x: number; // 0.0 - 1.0 (relative width)
  y: number; // 0.0 - 1.0 (relative height)
}

export interface VfxSpatialLayerItem {
  effectType: string;
  position: OverlayPosition;
  scale: number;
  colorHex?: string;
  triggerSec?: number;
}

export interface WordBoundary {
  offset: number;
  duration: number;
  text: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  voiceProfile?: string;
  pitch?: string;
  rate?: string;
}

export interface AudioModulation {
  pitchShiftFactor?: number;
  playbackTempo?: number;
  emotionalTone?: string;
}

export interface StoryShot {
  shotNumber: number;
  sceneId?: string | number;
  bookOrPart?: string;
  timeframe: string;
  startTimeSec: number;
  endTimeSec: number;
  durationSec?: number;
  type: string;
  mood: string;
  vocalCue?: string;
  audioModulation?: AudioModulation;
  transitionEffect?: string;
  voiceoverEgyptian: string;
  soundDesign: string;
  colorTheme: string;
  imagePromptEn: string;
  imageFilename?: string;
  backgroundPromptEn?: string;
  foregroundElementPromptEn?: string;
  foregroundAnimation?: ForegroundAnimationType;
  customForegroundImageId?: string;
  matchedForegroundFileName?: string;
  charactersInShot?: string[];
  cameraMotion?: CameraMotionType;
  transitionOut?: TransitionOutType;
  beats?: BeatItem[];
  sfxList?: ShotSfxItem[];
  soundMusic: string;
  soundSfx: string;
  sfxLibrarySource?: string;
  customImageId?: string;
  matchedFileName?: string;
  imageMatchMethod?: "json_filename" | "shot_number" | "ordinal" | "manual";
  customAudioId?: string;
  audioDurationSec?: number;
  actualAudioDurationSec?: number;
  sceneType: SceneArtType | string;
  textOverlay: string;
  sfxName: string;
  assignedSfxId?: number;
  sfxVolumePercent: number;
  sfxTriggerSec: number;
  dialogueLines: DialogueLine[];
  vfxSettings?: VfxSettings;
  textOverlayPos?: OverlayPosition;
  ctaPos?: OverlayPosition;
  vfxSpatialLayers?: {
    runeCenter?: { x: number; y: number };
    lightFocus?: { x: number; y: number };
    layers?: VfxSpatialLayerItem[];
  };
  spatialLayers?: VfxSpatialLayerItem[];
  wordBoundaries?: WordBoundary[];
}

export interface SeoMetadata {
  suggestedTitles: string[];
  titleOptions?: string[];
  description: string;
  hashtags: string;
  tags: string;
  recommendedUploadTime: string;
  thumbnailPromptEn?: string;
  pinnedComment?: string;
}

export interface VoiceOption {
  shortName: string;
  labelAr: string;
  gender: "female" | "male";
}

export interface StoryProject {
  id: string;
  title: string;
  platform: string;
  aspectRatio: AspectRatioType | string;
  totalShots: number;
  estimatedDurationSec?: number;
  language: string;
  seriesMeta?: SeriesMeta;
  globalStyleEn?: string;
  negativePromptEn?: string;
  characterBible?: CharacterBibleItem[];
  shots: StoryShot[];
  audioRecordId?: string;
  audioRecordDurationSec?: number;
  isBgmEnabled: boolean;
  selectedBgmId: number;
  customBgmId?: string;
  customBgmTitle?: string;
  customAudioBedId?: string;
  customAudioBedTitle?: string;
  customAudioBedVolume?: number;
  isSfxEnabled?: boolean;
  enableCameraShake?: boolean;
  enableModernAnimeOverlay?: boolean;
  enableAnimeVoiceEnhancer?: boolean;
  masterVfxDisabled?: boolean;
  bgmTrimStartSec?: number;
  bgmTrimEndSec?: number;
  bgmFadeInSec?: number;
  bgmFadeOutSec?: number;
  bgmDuckingStrength?: number;
  transitionType: TransitionTypeId;
  shotDurationSec: number;
  showSubtitlesInVideo: boolean;
  channelName: string;
  showChannelWatermark: boolean;
  showSubscribeCta: boolean;
  enableDazzlingCTA?: boolean;
  vfxSettings?: VfxSettings;
  defaultTextOverlayPos?: OverlayPosition;
  defaultCtaPos?: OverlayPosition;
  enableVFXParticles?: boolean;
  enableVFXVignette?: boolean;
  enableVFXLaserFlare?: boolean;
  enableVFXSpeedlines?: boolean;
  enableVFXGlitch?: boolean;
  enableKenBurns?: boolean;
  voiceName: string;
  voiceNameAr: string;
  generatedVoiceIds: string[];
  generatedVoiceDurations: number[];
  seoMetadata?: SeoMetadata;
}

export interface ShotRange {
  startShot: number;
  endShot: number;
}
