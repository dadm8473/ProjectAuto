# ProjectAuto: Fortune Relay

`Fortune Relay`는 한국 협동 타워디펜스 인기작의 재미 문법을 기준으로 다시 만든 세로형 협동 랜덤 디펜스 게임입니다. 기존의 단순 패드 배치 TD가 아니라, 무작위 소환, 3합성, 확률 성장, 보스 타이머, 몬스터 누적 압박, 파트너 지원을 한 판 안에서 계속 판단하게 만듭니다.

## 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:4173`을 엽니다.

## 플레이 루프

- `Summon`: 공유 골드로 내 보드에 랜덤 유닛을 소환합니다.
- `Merge x3`: 같은 유닛/같은 별 3개를 선택해 더 높은 등급의 유닛으로 합성합니다.
- `Chance Up`: 골드를 써서 희귀/에픽/전설/신화 소환 확률을 올립니다.
- `Partner Boost`: 마나를 써서 파트너 보드의 가장 강한 유닛을 강화합니다.
- 중앙 루프에 몬스터가 쌓이면 `Pressure`가 오릅니다. 100에 닿으면 패배합니다.
- 보스 웨이브에서는 제한 시간 안에 보스를 잡아야 합니다.

## 협동

- 서버 없이 테스트하면 봇 파트너가 붙습니다.
- 봇은 플레이어가 첫 소환을 하기 전에는 공유 골드를 쓰지 않습니다.
- `Online`을 누르면 같은 Node 서버의 WebSocket 룸에 접속합니다.
- 같은 네트워크 기기에서 `http://<서버IP>:4173`으로 접속하면 같은 룸을 공유합니다.

## BM 구조

실제 결제 SDK는 연결하지 않았습니다. 대신 상용화 연결이 가능한 구조를 데이터로 분리했습니다.

- 재화: `gold`, `mana`, `gems`
- 런 부스트: Lucky Cache
- 코스메틱: Mythic Aura, Founder Board
- 시즌 패스: Season Zero reward track
- 일일 미션: 합성, 보스 지원, 압박 클러치 미션

현재 빌드에서는 gems도 플레이로만 획득됩니다.

## 서버 배포 메모

Amazon EC2 같은 서버에서 Node.js 20 이상을 설치한 뒤:

```bash
PORT=4173 npm run start
```

보안 그룹에서 TCP `4173`을 열면 외부 기기에서 접속할 수 있습니다. 실제 서비스 전에는 HTTPS, 계정/매칭, 영속 저장소, 결제 SDK가 추가되어야 합니다.

## 구조

- `src/shared/content.js`: 유닛, 희귀도, 웨이브, 적, BM 데이터
- `src/shared/game.js`: 서버/클라이언트 공유 게임 규칙
- `src/client/app.js`: 세로형 캔버스 UI와 조작
- `server/server.js`: 정적 파일 서버와 WebSocket 협동 룸
- `server/ws.js`: 의존성 없는 WebSocket 프레임 처리
- `test/`: 랜덤 소환/합성/협동/보스/서버 테스트
