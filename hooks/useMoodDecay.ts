/**
 * 시간 경과에 따른 기분 감소를 계산한다.
 *
 * 핵심: setInterval 로 "값을 깎지" 않는다.
 * 항상 (앵커 기분, lastInteractionAt, 현재 시각) 으로 다시 계산하므로
 *  - 앱을 종료했다 다시 켜도 경과 시간이 그대로 반영되고
 *  - 백그라운드 복귀 시 중복 차감이 발생하지 않는다.
 * 타이머는 단지 화면을 다시 그리게 하는 역할만 한다.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { MOOD_DECAY } from '../constants/gameConfig';
import { computeCurrentMood } from '../utils/mood';

export function useMoodDecay(anchorMood: number, lastInteractionAt: number, paused = false): number {
  const [mood, setMood] = useState(() => computeCurrentMood(anchorMood, lastInteractionAt));
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      const next = computeCurrentMood(anchorMood, lastInteractionAt);
      if (next !== moodRef.current) {
        moodRef.current = next;
        setMood(next);
      }
    };

    // 앵커가 바뀌면 (간식/파티) 즉시 반영
    sync();

    if (paused) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(sync, MOOD_DECAY.tickMs);
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      // 복귀 시 곧바로 다시 계산 (누적된 시간이 한 번에 반영된다)
      if (status === 'active') sync();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [anchorMood, lastInteractionAt, paused]);

  return mood;
}
