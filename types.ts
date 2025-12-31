
export interface LyricUnit {
  char: string;
  jyutping: string;
  homophone: string;
}

export interface LyricLine {
  units: LyricUnit[];
}

export interface StyleConfig {
  pinyin: {
    show: boolean;
    fontSize: number;
    color: string;
    fontWeight: string;
  };
  lyric: {
    fontSize: number;
    color: string;
    fontWeight: string;
  };
  homophone: {
    show: boolean;
    fontSize: number;
    color: string;
    fontWeight: string;
  };
  lineSpacing: number;
  alignment: 'left' | 'center' | 'right';
}
