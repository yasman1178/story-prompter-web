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

export type SfxTypeId =
  | "MONSTER_ROAR"
  | "HEARTBEAT"
  | "STONE_CREAK"
  | "HEAVY_SLAM"
  | "LASER_BEAM"
  | "HEALING_MAGIC"
  | "FOOTSTEPS"
  | "LAUGHTER";

export interface SfxEffect {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  iconName: string;
  type: SfxTypeId;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface StoryShot {
  shotNumber: number;
  timeframe: string;
  startTimeSec: number;
  endTimeSec: number;
  type: string;
  mood: string;
  voiceoverEgyptian: string;
  soundDesign: string;
  colorTheme: string;
  imagePromptEn: string;
  imageFilename?: string;
  soundMusic: string;
  soundSfx: string;
  customImageId?: string;
  customAudioId?: string;
  audioDurationSec?: number;
  sceneType: SceneArtType;
  textOverlay: string;
  sfxName: string;
  assignedSfxId?: number;
  sfxVolumePercent: number;
  sfxTriggerSec: number;
  dialogueLines: DialogueLine[];
}

export interface SeoMetadata {
  suggestedTitles: string[];
  description: string;
  hashtags: string;
  tags: string;
  recommendedUploadTime: string;
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
  aspectRatio: string;
  totalShots: number;
  language: string;
  shots: StoryShot[];
  audioRecordId?: string;
  audioRecordDurationSec?: number;
  isBgmEnabled: boolean;
  selectedBgmId: number;
  customBgmId?: string;
  customBgmTitle?: string;
  transitionType: TransitionTypeId;
  shotDurationSec: number;
  showSubtitlesInVideo: boolean;
  channelName: string;
  showChannelWatermark: boolean;
  showSubscribeCta: boolean;
  enableDazzlingCTA?: boolean;
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
