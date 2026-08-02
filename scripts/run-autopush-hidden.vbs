' 콘솔 창 깜빡임 없이 AutoPush-Docs.ps1을 실행하는 래퍼입니다 (스케줄 작업용).
CreateObject("Wscript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -File ""D:\UE5\UE5_5.8_Dev\MainDev\Documentation\scripts\AutoPush-Docs.ps1""", 0, False
