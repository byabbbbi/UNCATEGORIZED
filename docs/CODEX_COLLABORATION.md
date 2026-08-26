# Codex와 함께 UNCATEGORIZED를 만든 과정

이 문서는 OpenAI Game Builders Seoul 제출 폼의 네 문항에 맞춘 원고다. A는 붙여넣기용 800자 이내 요약, B는 구현 근거를 포함한 상세 기록이다.

## A. 요약본 — 800자 이내

### 1. Codex를 어디에 사용했나

기존 게임을 바탕으로 요구사항 분해, 구현, 회귀 점검, 브라우저 확인, 커밋·PR 정리에 Codex를 사용했다. 작업 기록은 [PR #1~#6](https://github.com/byabbbbi/UNCATEGORIZED/pulls?q=is%3Apr)에 남겼다.

### 2. 어떤 기능을 구현했나

406건 하드테이블·리롤·띄어쓰기·저장, 오늘의 세계, 연대기 PNG, 카드 복제와 조합명 품질 검사, 그래핌 단위 이모지 제한, 8기둥, 판례 대장과 시대 사건부를 구현했다. 오늘의 세계는 1,000개 날짜에서 결정성·후보 조건 오류 0건과 초기 붕괴 291건(29.1%)을 확인했다.

### 3. 어떤 문제를 해결했나

`slice(0,4)`가 UTF-16 단위라 이모지 둘을 통과시키던 문제는 `Intl.Segmenter`로 첫 그래핌만 남겼다. 오염이 있으면 406건 하드테이블 전체가 꺼지던 조건은 붕괴 여부만 보게 하고 오염은 이름 후처리로 옮겼다. “벽돌부싯돌기류”류는 두 입력의 `headNoun()`이 결과에 모두 포함되는지 검사해 한 번 리롤한다.

### 4. 사람이 직접 결정한 부분

사람이 세계관·밸런스 수식, 작업별 스펙, PR 검토·병합 순서, Worker 배포·API 키 관리·서버측 모델 정책, 플레이 테스트를 결정했다. Codex는 그 경계 안에서 코드를 작성하고 검증 결과를 보고했다.

## B. 상세본

### 1. Codex를 어디에 사용했나

출발점은 2026년 8월 10일 완성된 조합 엔진·4기둥·선포·붕괴·엔딩·보관소 기반이다([`afe1173`](https://github.com/byabbbbi/UNCATEGORIZED/commit/afe1173276aa6e8e20727eb85778502ed3042b89)). 챌린지 기간에는 사람이 기능별 완료 조건과 금지 범위를 먼저 제시하고, Codex가 저장소를 읽어 영향 범위를 찾은 뒤 별도 브랜치에서 구현·빌드·검증·브라우저 확인·커밋·PR 본문 작성을 맡았다.

| 작업 | 근거 |
| --- | --- |
| 생성 이름 품질, 하드테이블 406건, 저장·초반 배율·띄어쓰기 | [`642f8e4`](https://github.com/byabbbbi/UNCATEGORIZED/commit/642f8e4429971817ca14df7d425d7c020cdb196f), [`30e5b23`](https://github.com/byabbbbi/UNCATEGORIZED/commit/30e5b23b928e8f0ea2064e3680bcf8eff25b219f), [`67ca727`](https://github.com/byabbbbi/UNCATEGORIZED/commit/67ca7275f7348080f8b567c67869cec360b2ab80) |
| 오늘의 세계 | [PR #1](https://github.com/byabbbbi/UNCATEGORIZED/pull/1), [`1ce14b3`](https://github.com/byabbbbi/UNCATEGORIZED/commit/1ce14b30ec7fd197dfa51f1b001996961ebc2281) |
| 연대기 이미지 내보내기 | [PR #2](https://github.com/byabbbbi/UNCATEGORIZED/pull/2), [`3a4eac3`](https://github.com/byabbbbi/UNCATEGORIZED/commit/3a4eac31d8daa437ab2e20708be279359e95e453) |
| 조합 품질 개선 + 카드 복제 | [PR #3](https://github.com/byabbbbi/UNCATEGORIZED/pull/3), [`ec3efcd`](https://github.com/byabbbbi/UNCATEGORIZED/commit/ec3efcdbbd7b9185b8a0711348fd009f9417da66) |
| 카드 이모지 1개 제한 | [PR #4](https://github.com/byabbbbi/UNCATEGORIZED/pull/4), [`0791b45`](https://github.com/byabbbbi/UNCATEGORIZED/commit/0791b4546a0ee9c072099c5f9a2f7a5098fbe5dd) |
| 8기둥 복원 | [PR #5](https://github.com/byabbbbi/UNCATEGORIZED/pull/5), [`8f794c3`](https://github.com/byabbbbi/UNCATEGORIZED/commit/8f794c36299f27c25fdb25e95fa46e6d1045906d) |
| 판례 대장 + 시대 사건부 | [PR #6](https://github.com/byabbbbi/UNCATEGORIZED/pull/6), [`8297aa7`](https://github.com/byabbbbi/UNCATEGORIZED/commit/8297aa7be803118f610fe5483351e26ee2acbdba) |

PR #2~#5는 앞 작업을 기준 브랜치로 삼은 연속 작업이었다. 이후 사람이 병합 순서를 검토해 기능 커밋을 `main`에 통합했으며, 실제 병합 커밋은 `9a4a855` → `78ef65b` → `70d837f` → `d4f2cba` → `f741406` 순서다. 판례 대장·사건부는 문서 작성 시점에 PR #6으로 열려 있다.

### 2. 어떤 기능을 구현했나

- **생성·저장 기반 정비**: few-shot 예시 3개와 부적절 이름 리롤 1회를 추가하고, 하드 조합을 406건으로 확장했다. 공백 제외 10자·최대 3어절 제한, 띄어쓰기 지원, 일반 런 저장·이어하기와 1·2시대 선포 배율도 코드로 고정했다.
- **오늘의 세계**: KST `YYYY-MM-DD` 해시와 `mulberry32`로 시작 원소 4개, 초기 승격 오염 1개, 30% 확률의 초기 붕괴 1개를 결정한다. 일반 저장과 분리하고 날짜가 바뀌면 전날 저장을 무시한다. 현행 함수로 2024-01-01부터 1,000개 날짜를 다시 실행해 동일 날짜 결정성, 시작 원소 4개 유일성·depth 1~2 조건 오류가 0건이었고, 초기 붕괴는 291건으로 29.1%였다.
- **연대기 PNG 내보내기**: 엔딩의 기록 내보내기 버튼이 `document.fonts.ready`를 기다린 뒤 Canvas API로 1080×1920 이미지를 만든다. 엔딩·통계·긴 연대기의 앞뒤·붕괴 규칙·일일 날짜와 오염을 넣고 PNG로 내려받는다.
- **조합 품질 + 카드 복제**: 붕괴하지 않은 오염 세계도 하드테이블을 사용하게 했고, 오염 접두는 캐시 키를 시드로 한 결정적 30% 후처리로 적용했다. 카드 더블클릭은 같은 개념 인스턴스를 20px 오른쪽 아래에 spring으로 생성하되 처리 중·검열 카드는 차단한다.
- **이름·이모지 방어**: `headNoun()` 기반 concat 판정, 프롬프트 금지 규칙, 모든 결과 경로의 10자 제한을 통합했다. 이모지는 `Intl.Segmenter`로 첫 그래핌 하나만 남기고 CSS와 406건 검증 스크립트로 이중 방어했다.
- **8기둥 복원**: RELATIO/인연, LOCUS/좌표, HABITUS/소유, ACTIO/인과를 기존 네 기둥에 더했다. 타입·도장·질문·신 대사·붕괴 규칙·프롬프트 enum·폴백·우측 패널을 함께 확장하고, 무구별 엔딩은 8개 중 6개 붕괴로 일치시켰다.
- **판례 대장**: 최초 발견 개념에 부모, 시대, 붕괴 수, 활성 오염, 연대기 문장을 저장한다. 카드 클릭 시 하단에서 부모와 파생 최대 5개, 기둥과 파괴력을 읽을 수 있으며 저장 버전은 2로 올렸다.
- **시대 사건부**: 세계 시드로 8개 과제를 섞어 6개 시대에 중복 없이 배정한다. 달성 상태를 HUD에 표시하고 시대 마감 시 파편 3개와 정확한 종결 기록을 지급하며, 미달성 페널티나 과제 교체는 넣지 않았다.

### 3. 어떤 문제를 해결했나

#### 사례 1 — 이모지 둘이 카드 이름을 가림

기존 `emoji: String(r.emoji || '❔').slice(0, 4)`는 사용자가 보는 문자 수가 아니라 UTF-16 코드 단위를 잘랐다. 단순 이모지는 보통 두 코드 단위이므로 `🔥🗣️`, `💣📨`처럼 둘 이상이 통과할 수 있었고, ZWJ 가족 이모지나 피부색 변형도 중간에서 잘릴 수 있었다. [`0791b45`](https://github.com/byabbbbi/UNCATEGORIZED/commit/0791b4546a0ee9c072099c5f9a2f7a5098fbe5dd)에서 `Intl.Segmenter('ko', { granularity: 'grapheme' })`로 첫 그래핌만 취하고, 미지원 환경은 첫 코드 포인트로 폴백했다. API 정규화뿐 아니라 하드테이블·폴백·가챠·일일 시작·데모·저장 복원에도 같은 유틸을 적용했다.

#### 사례 2 — 오염된 세계에서 하드테이블 406건이 전부 비활성

기존 `generate()`는 붕괴와 활성 오염이 모두 없을 때만 하드테이블을 조회했다. 따라서 처음부터 오염이 3회 승격된 오늘의 세계는 붕괴가 없어도 406건을 한 번도 쓰지 못하고 캐시/API 단계로 내려갔다. [`ec3efcd`](https://github.com/byabbbbi/UNCATEGORIZED/commit/ec3efcdbbd7b9185b8a0711348fd009f9417da66)에서 조건을 `collapsed.length === 0`으로 완화하고, 활성 오염은 결과 이름에 결정적 30%로 붙이는 코드 후처리로 분리했다. 오염 목록이 캐시 키에 포함되므로 오염 세계 결과는 별도 항목으로 저장된다.

#### 사례 3 — “벽돌부싯돌기류” 같은 concat 이름이 통과

정확히 `A+B`와 같은 문자열만 막는 검사는 입력의 일부가 변형되거나 수식어가 붙은 `벽돌부싯돌기류`, `폭풍석괴성화구돌`, `화구돌 폭발벽돌`을 놓쳤다. [`ec3efcd`](https://github.com/byabbbbi/UNCATEGORIZED/commit/ec3efcdbbd7b9185b8a0711348fd009f9417da66)에서 공백을 제거한 결과가 입력 A와 B의 `headNoun()`을 모두 부분 문자열로 포함하면 concat으로 판정하도록 바꿨다. 같은 개념의 심화 조합과 관계 기둥 붕괴는 의도된 결합이므로 예외로 두고, 나머지는 기존 1회 리롤 뒤에도 실패하면 폴백한다.

### 4. 사람이 직접 결정한 부분

- **게임 기획과 밸런스**: 사람이 “조합 → 선포 → 신의 사임 → 프롬프트 규칙 누적”이라는 핵심 루프와 여섯 시대 구조를 정했다. `T`, `D`, 정합성 감소, 선포 파편 공식은 최초 커밋 [`afe1173`](https://github.com/byabbbbi/UNCATEGORIZED/commit/afe1173276aa6e8e20727eb85778502ed3042b89)에 들어갔고 이후 신규 기능 작업에서도 바꾸지 않았다. 8기둥에서 달성 가능한 무구별 기준을 6개로 둘지는 사람이 스펙에서 확정했고 결과 커밋은 [`8f794c3`](https://github.com/byabbbbi/UNCATEGORIZED/commit/8f794c36299f27c25fdb25e95fa46e6d1045906d)이다.
- **스펙과 범위**: 사람이 각 작업의 입력·출력·금지 조건을 문서화했다. 예를 들어 판례 대장에는 미발견 힌트를 넣지 않고, 사건부에는 선택·교체·미달성 페널티를 넣지 않도록 범위를 고정했다. Codex는 이 조건을 구현하고 PR #6의 제외 범위에 다시 기록했다.
- **리뷰와 병합 전략**: 사람이 작업을 PR 단위로 검토하고 연속 브랜치의 병합 순서를 정했다. `main`의 병합 근거는 [`9a4a855`](https://github.com/byabbbbi/UNCATEGORIZED/commit/9a4a8556a56d26c21e2e10a91ed7d7a59e9299d0), [`78ef65b`](https://github.com/byabbbbi/UNCATEGORIZED/commit/78ef65b4f6e25936458a694b96448522d0e6b69b), [`70d837f`](https://github.com/byabbbbi/UNCATEGORIZED/commit/70d837f520a62142fd8d207d29014799228f649f), [`d4f2cba`](https://github.com/byabbbbi/UNCATEGORIZED/commit/d4f2cba5a248b30a88ad4f96c5a059362162709d), [`f741406`](https://github.com/byabbbbi/UNCATEGORIZED/commit/f741406d17ee61435d150ab5943c0320ce0f6276)이다.
- **배포와 운영 보안**: 사람이 Cloudflare Worker를 배포하고 API 키를 Secret으로 관리하며 서버측 모델 정책을 선택했다. 저장소에는 프런트가 Worker 엔드포인트를 사용하도록 한 [`18fb083`](https://github.com/byabbbbi/UNCATEGORIZED/commit/18fb08315d15ab333a8d3bfd71d25ffe4a7d5c11)만 남아 있다. 실제 키와 서버 환경변수 값은 의도적으로 Git과 이 문서에 남기지 않았다.
- **플레이 테스트와 최종 승인**: 사람은 브라우저에서 조합 감각, 카드 가독성, 과제 난이도, 붕괴 속도와 엔딩 흐름을 직접 확인하고 수정 승인 여부를 결정했다. Codex의 자동·브라우저 검증 결과는 각 PR 본문에 남겨 재현 가능한 판단 자료로 제공했다.
