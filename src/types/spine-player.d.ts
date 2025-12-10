declare namespace JSX {
  interface IntrinsicElements {
    'spine-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      skeleton?: string;
      atlas?: string;
      animation?: string;
      skin?: string;
      'background-color'?: string;
      alpha?: string;
      scale?: string;
      x?: string;
      y?: string;
      width?: string;
      height?: string;
      fit?: string;
      alignment?: string;
      debug?: string;
      premultipliedAlpha?: string;
      onready?: () => void;
      onerror?: (event: CustomEvent) => void;
    };
  }
}

interface SpinePlayerElement extends HTMLElement {
  play: (animationName?: string, loop?: boolean) => void;
  pause: () => void;
  setAnimation: (trackIndex: number, animationName: string, loop?: boolean) => void;
  setSkin: (skinName: string) => void;
  getBounds: () => { x: number; y: number; width: number; height: number };
  skeleton: any;
  animationState: any;
}
