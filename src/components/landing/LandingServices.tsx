import type { Reg } from './landingRefs'
import { SERVICES } from './landingScenes'

// 서비스 목록 7줄 — 원본 #svl. 끼루가 노트북 위 해당 칸에 도착하면 그 줄이 켜진다(.on)

export function LandingServices({ reg }: { reg: Reg }) {
  return (
    <ol className="svl" id="svl" ref={reg('svl')}>
      {SERVICES.map((s) => (
        <li key={s.name}>{s.name}</li>
      ))}
    </ol>
  )
}
