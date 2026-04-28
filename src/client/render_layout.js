export const VIEW_WIDTH = 390;
export const MIN_VIEW_HEIGHT = 500;
export const MAX_VIEW_HEIGHT = 760;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function computeCanvasViewport({ stageWidth = VIEW_WIDTH, stageHeight = MIN_VIEW_HEIGHT } = {}) {
  const safeStageWidth = Math.max(1, stageWidth || VIEW_WIDTH);
  const safeStageHeight = Math.max(1, stageHeight || MIN_VIEW_HEIGHT);
  const viewHeight = clamp(Math.round((safeStageHeight / safeStageWidth) * VIEW_WIDTH), MIN_VIEW_HEIGHT, MAX_VIEW_HEIGHT);
  const displayScale = Math.min(safeStageWidth / VIEW_WIDTH, safeStageHeight / viewHeight);
  const displayWidth = Math.max(1, Math.floor(VIEW_WIDTH * displayScale));
  const displayHeight = Math.max(1, Math.floor(viewHeight * displayScale));

  return {
    viewWidth: VIEW_WIDTH,
    viewHeight,
    displayWidth,
    displayHeight
  };
}

export function buildSceneLayout(viewHeight = MIN_VIEW_HEIGHT) {
  const safeHeight = clamp(Math.round(viewHeight), MIN_VIEW_HEIGHT, MAX_VIEW_HEIGHT);
  const topBoard = { x: 18, y: 64, w: 354, h: 126 };
  const bottomBoardY = Math.max(354, safeHeight - 156);
  const bottomBoard = { x: 18, y: bottomBoardY, w: 354, h: 126 };
  const trackTop = topBoard.y + topBoard.h + 14;
  const trackBottom = bottomBoard.y - 14;
  const trackHeight = Math.max(128, trackBottom - trackTop);
  const track = { x: 20, y: trackTop, w: 350, h: trackHeight };
  const loop = {
    cx: 195,
    cy: track.y + track.h / 2,
    rx: 132,
    ry: clamp(Math.round(track.h * 0.36), 57, 94)
  };

  return {
    viewHeight: safeHeight,
    boardRects: {
      p2: topBoard,
      p1: bottomBoard
    },
    track,
    loop,
    eventBanner: {
      x: 18,
      y: Math.max(188, track.y - 14),
      w: 354
    }
  };
}
