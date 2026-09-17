/** OIIA MAX 이벤트 오버레이 (테스트 E 의 연출/타이머 부분) */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import OiiaPartyOverlay from '../components/OiiaPartyOverlay';
import { DJ_CONFIG } from '../constants/gameConfig';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('OiiaPartyOverlay', () => {
  it('OIIA 타이틀과 하단 구호가 표시된다', () => {
    render(<OiiaPartyOverlay onFinish={jest.fn()} />);
    expect(screen.getByText('OIIA OIIA')).toBeTruthy();
    expect(screen.getByText('MOOD MAX!')).toBeTruthy();
    expect(screen.getByText('우이이이아이이이우이이아이이!!')).toBeTruthy();
  });

  it('약 8초 뒤에 스스로 종료된다 (중복 호출 없음)', () => {
    const onFinish = jest.fn();
    render(<OiiaPartyOverlay onFinish={onFinish} />);

    act(() => {
      jest.advanceTimersByTime(DJ_CONFIG.eventDuration - 100);
    });
    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(200 + DJ_CONFIG.outroDuration + 100);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('부모가 리렌더되어 onFinish identity 가 바뀌어도 8초에 정확히 끝난다', () => {
    // 회귀 테스트: onFinish 를 effect 의존성에 두면 부모 리렌더마다
    // 타이머가 리셋되어 파티가 끝나지 않는 버그가 있었다.
    const onFinish = jest.fn();
    const view = render(<OiiaPartyOverlay onFinish={() => onFinish()} />);

    // 이벤트 도중 여러 번 리렌더 (매번 새 화살표 함수를 넘긴다)
    for (const t of [1000, 2000, 3000, 4000, 5000, 6000, 7000]) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      view.rerender(<OiiaPartyOverlay onFinish={() => onFinish()} />);
      expect(onFinish).not.toHaveBeenCalled();
    }

    // 8초 + 퇴장 연출이 지나면 타이머 리셋 없이 정확히 종료된다
    act(() => {
      jest.advanceTimersByTime(
        DJ_CONFIG.eventDuration - 7000 + DJ_CONFIG.outroDuration + 100,
      );
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('도중에 언마운트되어도 타이머가 남아 onFinish 를 부르지 않는다', () => {
    const onFinish = jest.fn();
    const view = render(<OiiaPartyOverlay onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    view.unmount();
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(onFinish).not.toHaveBeenCalled();
  });
});
