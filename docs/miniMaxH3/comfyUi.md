윈도우(네이티브)에서 ComfyUI + Claude Code MCP 설치 가이드

WSL 없이 윈도우에서 직접 로컬 GPU로 ComfyUI를 돌리고, Claude Code에서 MCP 플러그인으로 제어하기 위한 설치 순서입니다.

방법 선택: Desktop vs 소스 설치
방식	추천 대상
ComfyUI Desktop	처음 써보고 빠르게 시작하고 싶은 경우 (추천)
소스 설치	세밀한 설정, 최신 기능이 필요한 경우

윈도우 네이티브 환경에서는 Desktop 버전이 GUI 설치라 가장 간단합니다. 이 문서는 두 방법 모두 다룹니다.

A. ComfyUI Desktop으로 설치 (초보자 추천)
1. 다운로드 및 설치

https://www.comfy.org/download 에서 Windows용 설치 파일을 받아 실행합니다.

설치 마법사가 GPU(NVIDIA)를 자동 감지하고 필요한 구성요소를 함께 설치합니다
설치 후 실행하면 자동으로 http://127.0.0.1:8188 에서 서버가 켜집니다
2. 정상 작동 확인

브라우저에서 http://127.0.0.1:8188 접속 → 기본 예제 워크플로우로 이미지 한 장 생성 테스트

B. 소스에서 직접 설치 (세밀한 제어 원할 때)
1. GPU 확인

PowerShell 또는 cmd에서:

powershell
nvidia-smi

결과가 뜨면 NVIDIA 드라이버 정상. 안 뜨면 NVIDIA 드라이버 최신으로 업데이트.

2. Python 설치

python.org에서 Python 3.12 설치 (설치 시 "Add python.exe to PATH" 체크 필수)

powershell
python --version
3. ComfyUI 소스 클론 및 가상환경 생성
powershell
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
python -m venv venv
.\venv\Scripts\activate

이후 모든 pip install은 반드시 (venv)가 표시된 상태에서 실행

4. CUDA용 PyTorch 먼저 설치 (순서 중요!)
powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128

requirements.txt를 먼저 설치하면 CUDA 버전이 CPU 버전으로 덮어써질 수 있으므로 반드시 torch 먼저 설치. RTX 40 시리즈(Ada) 이상 + 최신 NVIDIA 드라이버 환경에서는 cu128 빌드를 사용 (아래 트러블슈팅 참고)

설치 후 CUDA 인식 확인:

powershell
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"

torch 2.11.0+cu128 True NVIDIA GeForce RTX 4080 SUPER 처럼 True가 나와야 정상. False면 CPU 전용 torch가 깔린 것이므로 재설치

5. 나머지 패키지 설치
powershell
pip install -r requirements.txt
6. ComfyUI 실행
powershell
python main.py

윈도우는 tmux가 없으므로, 창을 닫으면 서버도 종료됩니다. 계속 켜두려면 이 창을 최소화만 하고 닫지 마세요. (백그라운드 유지가 필요하면 Windows Terminal 새 탭이나 작업 스케줄러 사용 고려)

7. 브라우저에서 접속 확인
http://127.0.0.1:8188

기본 예제 워크플로우로 이미지 한 장 생성 테스트

Claude Code + MCP 플러그인 연결 (A, B 공통)
8. Node.js 설치

nodejs.org에서 LTS 버전 설치 후:

powershell
node -v   # v22 이상 권장
9. Claude Code 설치
powershell
npm install -g @anthropic-ai/claude-code
claude
10. Claude Code 안에서 MCP 플러그인 설치

Claude Code 대화창 안에서 (터미널 아님):

/plugin marketplace add artokun/comfyui-mcp
/plugin install comfy

설치 후 Claude Code를 완전히 종료 후 재실행해야 반영됩니다.

ComfyUI와 Claude Code는 같은 윈도우 환경 안에 있으므로 localhost:8188 연결에 별도 설정이 필요 없습니다.

11. 모델 파일 받기

Claude Code에 요청:

SDXL 체크포인트 다운로드해줘
12. 첫 테스트
고양이 그려줘

처음엔 반드시 이미지로 먼저 테스트 (영상은 설정이 훨씬 까다로움).

트러블슈팅
nvidia-smi 안 뜸

→ 윈도우 NVIDIA 드라이버 업데이트 필요

ComfyUI가 매우 느림 (GPU 안 쓰는 느낌)

→ torch가 CPU 전용 버전으로 설치됨. 4단계 순서(torch 먼저 설치) 확인 후 재설치

ImportError: comfy_kitchen ... unsupported type list[int]

이건 설치 실수가 아니라 ComfyUI 최신 버전이 요구하는 comfy_kitchen 가속 라이브러리와 설치된 PyTorch 버전 간의 알려진 호환성 버그입니다.

해결 순서:

PyTorch를 최신으로 재설치:
powershell
   pip uninstall torch torchvision torchaudio -y
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
그래도 안 되면 comfy_kitchen 제거 시도:
powershell
   pip uninstall comfy_kitchen -y
그래도 안 되면 main 브랜치 대신 안정 릴리즈 태그로 재설치:
powershell
   cd ..
   Remove-Item -Recurse -Force ComfyUI
   git clone https://github.com/comfyanonymous/ComfyUI
   cd ComfyUI
   git tag -l
   git checkout <최신 안정 태그>
Claude가 ComfyUI를 못 찾음

→ ComfyUI가 실행 중인지(python main.py 창이 살아있는지) 먼저 확인

플러그인 명령이 안 먹힘

→ 터미널이 아니라 Claude Code 안에서 /plugin ... 슬래시 명령어를 입력해야 함

python, node, git 명령어가 인식 안 됨

→ 설치 시 "Add to PATH" 옵션을 안 눌렀을 가능성. 재설치하며 PATH 체크박스 확인, 또는 환경 변수에 수동 등록 후 터미널 재시작




 C:\Users\cho\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\diffusion_models
     C:\Users\cho\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\vae
     C:\Users\cho\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\text_encoders