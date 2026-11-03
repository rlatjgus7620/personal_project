"use client";
// 오래 걸리는지 알려주는 작은 훅 (v2.0.1)
// 무료 배포 서버는 한동안 안 쓰면 잠들어서, 처음 요청에 최대 1분쯤 걸림 → 안내 문구를 보여주려고

import { useEffect, useState } from "react";

export const SLOW_SERVER_MESSAGE =
  "서버를 깨우는 중일 수 있어요. 무료 서버는 오래 쉬었다가 처음 접속할 때 1분 가까이 걸립니다.";

// active가 ms 이상 계속 true면 true
export function useSlowNotice(active: boolean, ms = 3000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return slow;
}
