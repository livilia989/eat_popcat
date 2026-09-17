/** 사운드 매니저: 첫 터치 전 무음, ON/OFF, BGM 정리, 실패 내성 (테스트 F) */
import { act, renderHook } from '@testing-library/react-native';

import { useSound } from '../hooks/useSound';

const players: any[] = [];

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => {
    const p = {
      playing: false,
      loop: false,
      volume: 1,
      play: jest.fn(function (this: any) {
        this.playing = true;
      }),
      pause: jest.fn(function (this: any) {
        this.playing = false;
      }),
      seekTo: jest.fn(() => Promise.resolve()),
      remove: jest.fn(),
    };
    players.push(p);
    return p;
  }),
}));

const { createAudioPlayer } = require('expo-audio');

beforeEach(() => {
  players.length = 0;
  jest.clearAllMocks();
});

describe('useSound', () => {
  it('첫 터치(unlock) 전에는 아무 소리도 재생하지 않는다', () => {
    const { result } = renderHook(() => useSound(true));
    act(() => {
      result.current.play('popcat_pop');
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('unlock 이후에는 재생되고, 같은 사운드는 플레이어를 재사용한다', () => {
    const { result } = renderHook(() => useSound(true));
    act(() => {
      result.current.unlock();
      result.current.play('popcat_pop');
      result.current.play('popcat_pop');
      result.current.play('popcat_pop');
    });
    // 중복 생성 없음
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(players[0].play).toHaveBeenCalledTimes(3);
    expect(players[0].seekTo).toHaveBeenCalledWith(0);
  });

  it('사운드 OFF 면 효과음도 BGM 도 나지 않는다', () => {
    const { result } = renderHook(() => useSound(true));
    act(() => {
      result.current.unlock();
      result.current.setEnabled(false);
    });
    act(() => {
      result.current.play('popcat_pop');
      result.current.startBgm('oiia_loop');
    });
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('BGM 재생 중 사운드를 끄면 즉시 멈추고, 다시 켜면 이어진다', () => {
    const { result } = renderHook(() => useSound(true));
    act(() => {
      result.current.unlock();
      result.current.startBgm('oiia_loop');
    });
    const bgm = players[0];
    expect(bgm.loop).toBe(true);
    expect(bgm.playing).toBe(true);

    act(() => {
      result.current.setEnabled(false);
    });
    expect(bgm.playing).toBe(false);

    act(() => {
      result.current.setEnabled(true);
    });
    expect(bgm.playing).toBe(true);
  });

  it('stopBgm 은 BGM 을 멈추고 처음으로 되돌린다', () => {
    const { result } = renderHook(() => useSound(true));
    act(() => {
      result.current.unlock();
      result.current.startBgm('oiia_loop');
    });
    const bgm = players[0];
    act(() => {
      result.current.stopBgm(false);
    });
    expect(bgm.playing).toBe(false);
    expect(bgm.loop).toBe(false);
    expect(bgm.seekTo).toHaveBeenCalledWith(0);
  });

  it('언마운트 시 모든 플레이어를 정리한다 (메모리 누수 방지)', () => {
    const { result, unmount } = renderHook(() => useSound(true));
    act(() => {
      result.current.unlock();
      result.current.play('popcat_pop');
      result.current.play('snack_eat');
    });
    expect(players).toHaveLength(2);
    unmount();
    expect(players[0].remove).toHaveBeenCalled();
    expect(players[1].remove).toHaveBeenCalled();
  });

  it('플레이어 생성이 실패해도 예외를 던지지 않는다', () => {
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('broken mp3');
    });
    const { result } = renderHook(() => useSound(true));
    expect(() => {
      act(() => {
        result.current.unlock();
        result.current.play('popcat_pop');
        result.current.play('popcat_pop'); // 두 번째부터는 영구 무음 처리
      });
    }).not.toThrow();
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
  });
});
