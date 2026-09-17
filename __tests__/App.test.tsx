/**
 * 화면 전체 렌더링 스모크 테스트.
 * 사운드 재생이 실패해도(모두 throw 하도록 목킹) 앱이 죽지 않아야 한다.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../App';

// SafeAreaProvider 는 테스트 환경에서 인셋을 못 구해 자식을 렌더하지 않는다
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      __reset: () => {
        store = {};
      },
    },
  };
});

// 사운드 계층이 통째로 실패하는 최악의 상황을 가정한다
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    throw new Error('sound file unavailable');
  }),
  setAudioModeAsync: jest.fn(() => Promise.reject(new Error('no audio'))),
}));

describe('App 렌더링', () => {
  it('사운드가 전부 실패해도 메인 화면이 정상적으로 뜬다', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('팝캣 OIIA 파티')).toBeTruthy());

    // 기분 게이지 (기본 30 -> "조금 괜찮아요")
    expect(screen.getByText('조금 괜찮아요 😐')).toBeTruthy();
    expect(screen.getByTestId('mood-value')).toHaveTextContent('30 / 100');

    // 간식 3종
    expect(screen.getByText('쿠키')).toBeTruthy();
    expect(screen.getByText('치킨')).toBeTruthy();
    expect(screen.getByText('도넛')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
    expect(screen.getByText('+10')).toBeTruthy();
    expect(screen.getByText('+7')).toBeTruthy();

    // 사운드 토글
    expect(screen.getByText('ON')).toBeTruthy();
  });

  it('사운드 토글을 눌러도 크래시하지 않고 OFF 로 바뀐다', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('ON')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('사운드 끄기'));
    await waitFor(() => expect(screen.getByText('OFF')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('사운드 켜기'));
    await waitFor(() => expect(screen.getByText('ON')).toBeTruthy());
  });
});
