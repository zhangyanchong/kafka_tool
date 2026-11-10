Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
!include "LogicLib.nsh"

Name "Kafka Tool"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\KafkaTool"
InstallDirRegKey HKCU "Software\KafkaTool" "InstallDir"
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor /SOLID lzma
!define MUI_ICON "..\..\desktop\build\windows\icon.ico"
!define MUI_UNICON "..\..\desktop\build\windows\icon.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\KafkaTool.exe"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

Function .onInit
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "需要 Windows 10 或 Windows 11 64 位系统。"
    Abort
  ${EndIf}
  ${IfNot} ${IsNativeAMD64}
    MessageBox MB_ICONSTOP "此安装包仅支持 x64 系统。"
    Abort
  ${EndIf}
  SetShellVarContext current
FunctionEnd

Section "Kafka Tool"
  SetOutPath "$INSTDIR"
  ClearErrors
  File "${SOURCE_DIR}\KafkaTool.exe"
  File "${SOURCE_DIR}\README.txt"
  File "${SOURCE_DIR}\WebView2-version.txt"
  SetOutPath "$INSTDIR\WebView2"
  File /r "${SOURCE_DIR}\WebView2\*"
  IfErrors install_failed
  ExecWait '"$SYSDIR\icacls.exe" "$INSTDIR\WebView2" /grant *S-1-15-2-1:(OI)(CI)(RX) *S-1-15-2-2:(OI)(CI)(RX) /T /Q' $0
  ${If} $0 != 0
    Goto install_failed
  ${EndIf}
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Kafka Tool.lnk" "$INSTDIR\KafkaTool.exe"
  CreateDirectory "$SMPROGRAMS\Kafka Tool"
  CreateShortcut "$SMPROGRAMS\Kafka Tool\Kafka Tool.lnk" "$INSTDIR\KafkaTool.exe"
  CreateShortcut "$SMPROGRAMS\Kafka Tool\卸载.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\KafkaTool" "InstallDir" "$INSTDIR"
  SetRegView 64
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KafkaTool" "DisplayName" "Kafka Tool"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KafkaTool" "DisplayIcon" "$INSTDIR\KafkaTool.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KafkaTool" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KafkaTool" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KafkaTool" "NoRepair" 1
  Goto done
install_failed:
  MessageBox MB_ICONSTOP "安装未完成。请关闭正在运行的 Kafka Tool，并选择当前用户可写的本地目录后重试。"
  SetErrorLevel 1
  Abort
done:
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\Kafka Tool.lnk"
  Delete "$SMPROGRAMS\Kafka Tool\Kafka Tool.lnk"
  Delete "$SMPROGRAMS\Kafka Tool\卸载.lnk"
  RMDir "$SMPROGRAMS\Kafka Tool"
  Delete "$INSTDIR\KafkaTool.exe"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\WebView2-version.txt"
  RMDir /r "$INSTDIR\WebView2"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\KafkaTool"
  SetRegView 64
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KafkaTool"
SectionEnd
