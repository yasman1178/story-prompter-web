import { StoryProject, StoryShot } from "@/lib/types";
import { formatTimeframe } from "@/lib/utils";

export interface ShotTimelineItem {
  index: number;
  shot: StoryShot;
  startSec: number;
  durationSec: number;
  endSec: number;
}

export interface ProjectTimeline {
  items: ShotTimelineItem[];
  totalDurationSec: number;
  getShotAtTime: (timeSec: number) => {
    shot: StoryShot;
    localSec: number;
    durationSec: number;
    index: number;
  };
}

/**
 * Calculates the exact start time, duration, and end time for each shot in a project.
 * Priority for duration:
 * 1. Linked / generated voiceover audio duration (`shot.audioDurationSec`)
 * 2. Explicit timeframe duration from JSON (`shot.endTimeSec - shot.startTimeSec`)
 * 3. Default project shot duration (`project.shotDurationSec`)
 */
export function computeProjectTimeline(project: StoryProject): ProjectTimeline {
  const items: ShotTimelineItem[] = [];
  let currentStart = 0;
  const defaultDur = project.shotDurationSec || 6;

  for (let i = 0; i < project.shots.length; i++) {
    const shot = project.shots[i];

    let dur = defaultDur;
    if (typeof shot.audioDurationSec === "number" && shot.audioDurationSec > 0.5) {
      dur = shot.audioDurationSec;
    } else if (
      typeof shot.endTimeSec === "number" &&
      typeof shot.startTimeSec === "number" &&
      shot.endTimeSec > shot.startTimeSec
    ) {
      dur = shot.endTimeSec - shot.startTimeSec;
    }

    // Clamp duration to reasonable boundaries (minimum 1s, maximum 60s)
    dur = Math.max(1, Math.min(60, dur));

    const startSec = currentStart;
    const endSec = startSec + dur;

    items.push({
      index: i,
      shot,
      startSec,
      durationSec: dur,
      endSec,
    });

    currentStart = endSec;
  }

  const totalDurationSec = Math.max(1, currentStart);

  return {
    items,
    totalDurationSec,
    getShotAtTime(timeSec: number) {
      const t = Math.max(0, Math.min(timeSec, totalDurationSec - 0.0001));
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (t < item.endSec || i === items.length - 1) {
          return {
            shot: item.shot,
            localSec: Math.max(0, t - item.startSec),
            durationSec: item.durationSec,
            index: item.index,
          };
        }
      }
      const last = items[items.length - 1];
      return {
        shot: last ? last.shot : project.shots[0],
        localSec: last ? last.durationSec : defaultDur,
        durationSec: last ? last.durationSec : defaultDur,
        index: last ? last.index : 0,
      };
    },
  };
}

/**
 * Re-aligns a project's shot timeframes to match the computed timeline.
 */
export function syncProjectShotTimeframes(project: StoryProject): StoryShot[] {
  const timeline = computeProjectTimeline(project);
  return project.shots.map((shot, i) => {
    const item = timeline.items[i];
    if (!item) return shot;
    return {
      ...shot,
      startTimeSec: Math.round(item.startSec * 100) / 100,
      endTimeSec: Math.round(item.endSec * 100) / 100,
      timeframe: formatTimeframe(Math.round(item.startSec), Math.round(item.endSec)),
    };
  });
}
