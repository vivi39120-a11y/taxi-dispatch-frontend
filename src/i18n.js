// src/i18n.js

export const LANGS = {
  zh: '中文',
  en: 'English',
  ko: '한국어',
  ja: '日本語',
};

export const DEFAULT_LANG = 'zh';

export const translations = {
  zh: {
    // 共用
    subtitle: '同一個前端模擬 乘客端 / 司機端 即時連動',
    riderTab: '乘客端',
    driverTab: '司機端',
    languageLabel: '語言',

    // Landing / 介紹用（如果有用得到）
    landingTitle: '計程車派遣系統',
    landingDesc: '利用大數據分析，讓您不浪費時間等待。',
    landingPassengerBtn: '我是乘客',
    landingDriverBtn: '我是司機',
    landingAuthBtn: '登入 / 註冊',

    // Auth 頁面
    authTitle: '登入 / 註冊',
    authLoginTab: '登入',
    authRegisterTab: '註冊',
    authEmailLabel: 'Email',
    authPasswordLabel: '密碼',
    authLoginButton: '登入',
    authRegisterButton: '註冊',
    authHint:
      '（目前使用記憶體假資料庫，重新啟動伺服器後帳號會消失）',
  },

  en: {
    subtitle:
      'Single frontend simulating both rider & driver views in real time',
    riderTab: 'Rider',
    driverTab: 'Driver',
    languageLabel: 'Language',

    landingTitle: 'Taxi Dispatch System',
    landingDesc:
      'Use data intelligence to reduce your waiting time.',
    landingPassengerBtn: 'I am a rider',
    landingDriverBtn: 'I am a driver',
    landingAuthBtn: 'Sign in / Sign up',

    authTitle: 'Sign in / Sign up',
    authLoginTab: 'Sign in',
    authRegisterTab: 'Sign up',
    authEmailLabel: 'Email',
    authPasswordLabel: 'Password',
    authLoginButton: 'Sign in',
    authRegisterButton: 'Sign up',
    authHint:
      '(Using in-memory demo database; all accounts will be lost after server restart.)',
  },

  ko: {
    subtitle:
      '하나의 프론트엔드에서 승객 / 기사 화면을 실시간으로 시뮬레이션',
    riderTab: '승객 화면',
    driverTab: '기사 화면',
    languageLabel: '언어',

    landingTitle: '택시 배차 시스템',
    landingDesc:
      '데이터 분석으로 기다리는 시간을 줄여 줍니다.',
    landingPassengerBtn: '승객입니다',
    landingDriverBtn: '기사입니다',
    landingAuthBtn: '로그인 / 회원가입',

    authTitle: '로그인 / 회원가입',
    authLoginTab: '로그인',
    authRegisterTab: '회원가입',
    authEmailLabel: '이메일',
    authPasswordLabel: '비밀번호',
    authLoginButton: '로그인',
    authRegisterButton: '회원가입',
    authHint:
      '(현재 메모리 기반 데모 DB를 사용 중이며, 서버가 재시작되면 계정이 삭제됩니다.)',
  },

  ja: {
    subtitle:
      '1つのフロントエンドで 乗客 / ドライバー画面をリアルタイムにシミュレート',
    riderTab: '乗客画面',
    driverTab: 'ドライバー画面',
    languageLabel: '言語',

    landingTitle: 'タクシー配車システム',
    landingDesc:
      'データ分析により待ち時間を短縮します。',
    landingPassengerBtn: '乗客として利用する',
    landingDriverBtn: 'ドライバーとして利用する',
    landingAuthBtn: 'ログイン / 登録',

    authTitle: 'ログイン / 登録',
    authLoginTab: 'ログイン',
    authRegisterTab: '新規登録',
    authEmailLabel: 'メールアドレス',
    authPasswordLabel: 'パスワード',
    authLoginButton: 'ログイン',
    authRegisterButton: '登録',
    authHint:
      '（現在はメモリ上のデモ用データベースを使用しており、サーバー再起動後はアカウントが削除されます。）',
  },
};
