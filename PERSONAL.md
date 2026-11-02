# 개인 pstack 관리

이 저장소는 `https://github.com/cursor/plugins.git`의 원본 이력을 사용한다. Sparse checkout으로 `pstack`과 개인 marketplace 메타데이터를 펼쳤다. T3 이식본을 가져오지 않았다.

- `upstream`은 Cursor 공식 저장소다.
- `origin`은 개인 포크 `https://github.com/ugabiga/skills`다.
- `main`은 개인 수정본을 관리하는 기본 브랜치다.
- `upstream/main`은 Cursor 원본의 원격 추적 브랜치다.
- `personal/upstream-base` 태그는 최초 원본 커밋을 기록한다.
- `pstack/skills/poteto-mode/references/execution-policy.md`가 통합한 실행 정책의 단일 관리 지점이다.

원본의 워크플로와 원칙을 유지하고, 스킬 진입점에서 개인 실행 정책을 먼저 읽는다. TW를 별도로 설치하지 않아도 정책을 읽을 수 있다. 실행 transport는 T3이므로 T3 도구가 없는 환경에서는 실행 위임이 차단된다. Cursor 자체에서 그대로 실행할 수 있는 범용 변환본은 아니다.

모델 우선순위는 2026-10-31 TW의 스냅샷이다. 기존 Butter 자동 갱신과 연결하지 않았다. 관리형 fallback 변경은 이 저장소에서 검토하고 커밋한다. 기존 `~/.config/pstack/models.md`는 선택적으로 읽으며, 해당 파일이나 설치된 plugin cache를 변경하지 않는다.

## 원본 업데이트

작업 트리가 깨끗한지 확인한 뒤 `main`에서 실행한다.

```sh
cd ~/Developer/Github/skills
git status --short
git switch main
git pull --ff-only origin main
git fetch upstream
git merge upstream/main
```

충돌이 생기면 원본 변경과 개인 정책을 함께 확인하고 해결한다. 수정 파일을 `git add`한 뒤 `git merge --continue`로 진행한다. 중단하려면 `git merge --abort`를 사용한다. 강제 덮어쓰기나 원본 파일 전체 복사로 충돌을 숨기지 않는다.

업데이트마다 스킬 진입점의 정책 참조, 새 실행 지침과 정책의 충돌, 모델 선택, setup-pstack, 상대 링크를 확인한다. 새로 추가된 workflow 스킬에도 정책 진입점을 붙인다. 구조 검증과 실행 사례 검증이 끝난 변경만 사용한다.

검증한 개인 변경은 `git push origin main`으로 포크에 보관한다. 원본 변경은 merge로 통합해 공개된 개인 수정 이력을 유지한다. 일반 업데이트에는 rebase나 강제 push가 필요하지 않다.

최초 기준과 현재 개인 변경은 다음 명령으로 확인한다.

```sh
git show personal/upstream-base --no-patch
git diff upstream/main...main -- pstack PERSONAL.md
```

`upstream`에는 개인 변경을 push하지 않는다. 개인 수정은 `origin/main`에 보관한다. 최초 원본 기준 태그 `personal/upstream-base`도 포크에 보관한다.

## 검증과 설치

실행 정책의 변경 사항과 복구한 로컬 수정은 `pstack/PERSONAL-INTEGRATION.md`에 기록한다. 업데이트 후 다음 검증을 실행한다. 코드 구현과 테스트 실행은 TW 실행 worker가 담당한다.

```sh
node pstack/scripts/verify-personal.mjs
node --test pstack/tests/personal/*.test.mjs
```

개인 marketplace 이름은 `skills`, plugin 이름은 `pstack`이다. 이 저장소의 로컬 경로를 등록하면 검증한 작업 트리에서 설치할 수 있다.

```sh
codex plugin marketplace add /Users/sanghwa/Developer/Github/skills
codex plugin add pstack@skills
claude plugin marketplace add /Users/sanghwa/Developer/Github/skills
claude plugin install pstack@skills
```

설치는 host가 관리하는 cache에 복사된다. 브랜치 push만으로 설치본이 바뀌지는 않는다. 변경 검증 후 marketplace와 plugin을 갱신하고 새 세션에서 적용 상태를 확인한다. 활성 설치 대상은 `pstack@skills` 하나이며, 모델 표는 `~/.config/pstack/models.md`로 통일한다. 이전 cache나 모델 표를 직접 덮어쓰지 않는다.

새 세션에서는 `pstack:poteto-mode`를 사용한다. 원본 관리본을 T3 실행 환경에 맞게 조정한 개인 plugin이며, T3 도구가 없는 환경에서는 실행 위임이 차단된다.
