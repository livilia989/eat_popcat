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
