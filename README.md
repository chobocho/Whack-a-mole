# 🔨 두더지 잡기 (Whack-a-mole)

> 외부 라이브러리·프레임워크 **0%** — TypeScript + HTML5 Canvas + IndexedDB만으로 구현한 1인용 두더지 잡기 게임.

---

## ✨ 주요 기능

### 🎨 100% Canvas 렌더링
- DOM 엘리먼트 없이 **모든 UI**(메뉴, 버튼, 스코어보드, 별점)를 Canvas 내부에서 직접 드로잉
- `requestAnimationFrame` 기반 통합 렌더 루프

### 🎮 스테이지 & 별점 시스템
- 매 스테이지마다 **목표 점수(Goal Score)** 설정 → 도달 시 다음 스테이지 자동 진입
- **3성 별점** 산출: 정확도 + 최대 콤보 + 잔여 시간 종합 평가
- 별점 등장 시 Canvas 파티클 + 폭죽 애니메이션

### 🐹 다양한 타겟
| 타겟 | 등장 | 효과 |
|------|------|------|
| 🟤 **일반 두더지** | 1스테이지~ | +100점 (콤보 배율 적용) |
| 👑 **황금 두더지** | 2스테이지~ | +500점 + 피버 게이지 대폭 상승 |
| 💣 **폭탄** | 6스테이지~ | -300점, 라이프 1 소모 |
| 🌸 **꽃 (트랩)** | **10스테이지~** | **-500점, 라이프 1 소모, 콤보 리셋** |

> 🌸 **꽃은 절대 때리지 마세요!** 타격 시 "삐-" 경고음과 함께 치명적인 페널티가 부여됩니다.

### 🔥 콤보 & 피버 시스템
- 연속 타격 성공 시 **점수 배율 증가** (5콤보마다 +1배)
- 콤보 12 도달 또는 피버 게이지 풀 충전 시 **5초간 피버 타임** → 모든 점수 ×3 + 화면 전체 파티클

### 📈 난이도 휴리스틱
- 스테이지가 올라갈수록 등장 속도·간격·특수 객체 확률을 정밀 제어하는 상태 머신
- 10스테이지 이후: 두더지 + 폭탄 + 꽃이 섞여 출현하는 복합 패턴

### 💾 자동 저장
- **IndexedDB**에 최고 기록 / 도달 스테이지 / 스테이지별 별점 저장
- 연결 유실 시 **LocalStorage**로 자동 폴백

### 📱 반응형 입력
- 와이드 화면(4×3) / 세로 화면(3×4) 자동 그리드 전환
- 마우스 · 터치 · 키보드(QWE-ASD-ZXC / NumPad 1-9) 모두 지원

### 🔊 절차적 오디오
- Web Audio API `OscillatorNode`로 모든 효과음을 **실시간 합성** (오디오 파일 0개)
- 타격음·황금음·폭발음·꽃 경고음·피버 팡파레까지 모두 신시사이저 방식

---

## 🕹️ 조작 방법

| 입력 | 동작 |
|------|------|
| 마우스 클릭 / 터치 | 두더지 타격 |
| `Q W E` / `A S D` / `Z X C` | 3×3 그리드 매핑 |
| `NumPad 7~9 / 4~6 / 1~3` | 3×3 그리드 매핑 |
| `← →` (메뉴) | 스테이지 선택 |
| `Enter` / `Space` | 시작 / 다음 |
| `Esc` / `P` | 일시 정지 |
| `M` | 음소거 토글 |

---

## 🚀 실행 방법

### 단일 파일로 즉시 실행
```bash
./build.sh
# 생성된 release/index.html을 브라우저로 열기만 하면 끝
```

`release/index.html`은 JS·CSS·HTML 전부 인라인된 **완전 독립 파일**입니다. 더블클릭으로 바로 실행되며 인터넷 연결도 필요하지 않습니다.

### 개발 모드
```bash
npm install      # devDependency: typescript (이것 하나뿐)
npm run watch    # tsc 워치 모드
npm run serve    # http://localhost:8080
```

> 모듈 import 때문에 `file://`로는 dev 모드가 동작하지 않습니다. `npm run serve`로 로컬 서버를 띄우세요. (`release/index.html`은 인라인이므로 `file://`로도 작동합니다.)

---

## 📁 프로젝트 구조

```
.
├── build.sh              # 빌드 오케스트레이션 (tsc → 번들 → release/)
├── index.html            # 개발용 HTML (dist/main.js 로드)
├── tsconfig.json
├── package.json          # devDependency: typescript only
├── src/
│   ├── main.ts           # 부팅 + 폴백 에러 핸들링
│   ├── game.ts           # 씬 매니저 + 렌더 루프 + 반응형 캔버스
│   ├── audio.ts          # Web Audio API 신시사이저
│   ├── storage.ts        # IndexedDB + LocalStorage 백업
│   ├── input.ts          # 마우스 / 터치 / 키보드 통합
│   ├── layout.ts         # 반응형 3×3 / 4×3 그리드
│   ├── entities.ts       # 절차적 두더지·꽃·폭탄·파티클 드로잉
│   ├── stage.ts          # 스테이지 설정 + 출현 확률 휴리스틱
│   ├── scoring.ts        # 점수 / 콤보 / 피버 / 별점
│   ├── ui.ts             # Canvas UI 프리미티브 (버튼·패널·별)
│   └── scenes/
│       ├── menu.ts       # 메인 메뉴
│       ├── play.ts       # 플레이 씬
│       └── result.ts     # 결과 + 별점 애니메이션
├── tools/
│   └── bundle.mjs        # 자체 ESM → 단일 IIFE 번들러 (0 deps)
└── release/
    └── index.html        # 빌드 결과물 (단일 파일, ~66 KB)
```

---

## 🛡️ 안정성

- 애니메이션 예외 발생 시 **폴백 렌더링** (붉은 에러 메시지)
- IndexedDB 실패 시 자동으로 LocalStorage 사용
- AudioContext 미지원 환경에서도 게임 자체는 정상 동작
- 모든 효과음은 합성, 그래픽은 절차적 — **외부 미디어 의존성 없음**

---

## 🔧 기술 스택

- **언어:** TypeScript 5 (strict)
- **런타임:** 브라우저 표준 API만 사용
  - Canvas 2D · Web Audio API · IndexedDB · `requestAnimationFrame` · Pointer/Touch events
- **빌드:** `tsc` + 자체 작성 50줄짜리 ESM → IIFE 번들러
- **외부 의존성:** **0개** (devDependency도 TypeScript 컴파일러뿐)

---

## 📜 License

MIT — see [LICENSE](./LICENSE)
