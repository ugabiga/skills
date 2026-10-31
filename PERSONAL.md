# 개인 pstack 관리

이 저장소는 `https://github.com/cursor/plugins.git`의 원본 이력을 사용한다. Sparse checkout으로 `pstack`만 펼쳤다. T3 이식본을 가져오지 않았다.

- `upstream`은 Cursor 공식 저장소다.
- `main`은 최초에 받은 원본 브랜치다.
- `personal/tw-integrated`는 개인 수정 브랜치다.
- `personal/upstream-base` 태그는 최초 원본 커밋을 기록한다.
- `pstack/skills/poteto-mode/references/execution-policy.md`가 통합한 실행 정책의 단일 관리 지점이다.

원본의 워크플로와 원칙을 유지하고, 스킬 진입점에서 개인 실행 정책을 먼저 읽는다. TW를 별도로 설치하지 않아도 정책을 읽을 수 있다. 실행 transport는 T3이므로 T3 도구가 없는 환경에서는 실행 위임이 차단된다. Cursor 자체에서 그대로 실행할 수 있는 범용 변환본은 아니다.

모델 우선순위는 2026-10-31 TW의 스냅샷이다. 기존 Butter 자동 갱신과 연결하지 않았다. 관리형 fallback 변경은 이 저장소에서 검토하고 커밋한다. 기존 `~/.config/t3-pstack/models.md`는 선택적으로 읽으며, 해당 파일이나 설치된 plugin cache를 변경하지 않는다.

## 원본 업데이트

작업 트리가 깨끗한지 확인한 뒤 개인 브랜치에서 실행한다.

```sh
cd ~/Developer/Github/skills
git status --short
git switch personal/tw-integrated
git fetch upstream
git rebase upstream/main
```

충돌이 생기면 원본 변경과 개인 정책을 함께 확인하고 해결한다. 수정 파일을 `git add`한 뒤 `git rebase --continue`로 진행한다. 중단하려면 `git rebase --abort`를 사용한다. 강제 덮어쓰기나 원본 파일 전체 복사로 충돌을 숨기지 않는다.

업데이트마다 스킬 진입점의 정책 참조, 새 실행 지침과 정책의 충돌, 모델 선택, setup-pstack, 상대 링크를 확인한다. 새로 추가된 workflow 스킬에도 정책 진입점을 붙인다. 구조 검증과 실행 사례 검증이 끝난 변경만 사용한다.

최초 기준과 현재 개인 변경은 다음 명령으로 확인한다.

```sh
git show personal/upstream-base --no-patch
git diff upstream/main...HEAD -- pstack PERSONAL.md
```

`upstream`에는 개인 변경을 push하지 않는다. 개인 GitHub 저장소를 만들면 별도 `origin`으로 추가한다. 현재 작업은 로컬 관리본 생성이며, 기존 T3 plugin의 교체나 Codex 스킬 설치는 포함하지 않는다.
