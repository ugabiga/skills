# 개인 pstack 관리

이 저장소는 `https://github.com/cursor/plugins.git`의 원본 이력을 사용한다. Sparse checkout으로 `pstack`만 펼쳤다. T3 이식본을 가져오지 않았다.

- `upstream`은 Cursor 공식 저장소다.
- `origin`은 개인 포크 `https://github.com/ugabiga/skills`다.
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

검증한 개인 변경은 `git push origin personal/tw-integrated`로 포크에 보관한다. 이미 push한 커밋을 rebase하면 원격 이력도 바뀐다. 먼저 원격 변경과 협업 여부를 확인하고, 명시적으로 승인된 경우에만 `git push --force-with-lease origin personal/tw-integrated`를 사용한다. 이력 재작성을 피해야 하는 공유 브랜치에서는 rebase 대신 `git merge upstream/main`으로 원본을 통합한다.

최초 기준과 현재 개인 변경은 다음 명령으로 확인한다.

```sh
git show personal/upstream-base --no-patch
git diff upstream/main...HEAD -- pstack PERSONAL.md
```

`upstream`에는 개인 변경을 push하지 않는다. 개인 수정은 `origin`의 `personal/tw-integrated` 브랜치에 보관한다. 최초 원본 기준 태그 `personal/upstream-base`도 포크에 보관한다.

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

설치는 host가 관리하는 cache에 복사된다. 브랜치 push만으로 설치본이 바뀌지는 않는다. 변경 검증 후 marketplace와 plugin을 갱신하고 새 세션에서 적용 상태를 확인한다. 기존 `t3-pstack@t3-pstack`은 새 설치본을 확인한 뒤 비활성화해 중복 안내를 막는다. 이전 cache나 모델 표를 직접 덮어쓰지 않는다.

새 세션에서는 `pstack:poteto-mode`를 사용한다. 원본 관리본을 T3 실행 환경에 맞게 조정한 개인 plugin이며, T3 도구가 없는 환경에서는 실행 위임이 차단된다.
