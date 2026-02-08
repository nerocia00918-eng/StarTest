export enum Tab {
  KEYBOARD = 'KEYBOARD',
  MOUSE = 'MOUSE',
  SCREEN = 'SCREEN',
  AUDIO = 'AUDIO',
  MIC = 'MIC',
  WEBCAM = 'WEBCAM',
  AI_DIAGNOSTIC = 'AI_DIAGNOSTIC'
}

export interface KeyState {
  code: string;
  pressed: boolean;
  history: boolean; // Has been pressed at least once
}

export interface MouseStats {
  leftClick: boolean;
  rightClick: boolean;
  middleClick: boolean;
  backClick: boolean;    // Button 3 (Browser Back)
  forwardClick: boolean; // Button 4 (Browser Forward)
  scrollUp: boolean;
  scrollDown: boolean;
  doubleClick: boolean;
  x: number;
  y: number;
}