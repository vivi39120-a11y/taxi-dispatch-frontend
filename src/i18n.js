// src/i18n.js

const messages = {
  zh: {
    appTitle: 'NY Taxi Demo',
    language: '語言',
    passengerMode: '乘客端',
    driverMode: '司機端',

    currentPassengerLabel: '目前乘客：',
    currentDriverLabel: '目前司機：',
    notLoggedIn: '尚未登入',
    driverPrefix: '司機：',
    passengerPrefix: '乘客：',

    backHome: '回首頁',
    startVehicleSim: '啟動車輛模擬',
    stopVehicleSim: '停止車輛模擬',

    pickupPlaceholder: '上車地點（例如：Times Square）',
    dropoffPlaceholder: '目的地（例如：Central Park）',

    stopLabel: '中途停靠點',
    stopPlaceholder: '輸入停靠地點',
    addStop: '＋ 新增停靠點',
    removeStop: '移除停靠點',

    viewPriceAndCars: '查看價格與車輛',
    estimatedDistancePrefix: '預估距離：約',
    distanceKmUnit: '公里',

    ordersTitlePassenger: '我的訂單',
    ordersTitleDriver: '待接訂單',
    refresh: '重新整理',
    loading: '更新中…',

    driverStatusLabel: '狀態：',
    driverStatusIdle: '待命',
    driverStatusBusy: '服務中',
    pickupMarkerTitle: '乘客上車點',
    dropoffMarkerTitle: '目的地',
    stopMarkerTitle: '停靠點',

    needPickupDropoff: '請輸入上車地點與目的地',
    needLoginPassenger: '請先以乘客身分登入',
    needLoginDriver: '請先以司機身分登入',
    needPriceFirst: '請先按「查看價格與車輛」',
    needCoordsPrepared: '座標尚未準備好，請再按一次「查看價格與車輛」',
    cannotFindPickupOrDropoff: '找不到上車地或目的地，請確認地址是否正確。',
    cannotFindStop: '找不到某個停靠點，請確認地址是否正確。',
    tripTooFar: '此行程無法成立，請重新輸入地點。',
    networkError: '目前無法連線到伺服器，請稍後再試。',
    cannotConnectServer: '目前無法連線到伺服器，請稍後再試。',
    createOrderFailed: '下單失敗，請稍後再試。',
    acceptOrderFailed: '接單失敗，請稍後再試。',
    attachDriverFailed: '無法建立司機車輛，請稍後再試。',
    driverVehicleNotAttached: '尚未綁定司機車輛，請重新登入司機或稍後再試。',

    // Auth
    authTitle: 'SmartDispatch 帳號',
    login: '登入',
    register: '註冊',
    registerNow: '立即註冊',
    usernameLabel: '帳號',
    passwordLabel: '密碼',
    usernamePlaceholder: '設定一個登入帳號',
    passwordPlaceholder: '至少 6 碼',
    roleLabel: '身分',
    rolePassenger: '乘客',
    roleDriver: '司機',
    carTypeLabel: '車輛種類',
    carTypeYellow: 'Yellow 計程車',
    carTypeGreen: 'Green 計程車',
    carTypeFhv: 'FHV（多元計程車）',
    selectCarTypeHint: '請選擇車輛種類',
    loginFailed: '登入失敗',
    registerFailed: '註冊失敗',

    // 舊 key 相容
    auth_loginFailed: '密碼錯誤！',
    auth_registerFailed: '此帳號名稱已被使用！',

    // Auth error mapping（照你指定的文字）
    // 1. 還沒註冊過 → 請先登入（你如果想改成「請先註冊」只要改這一行即可）
    errorUsernameTaken: '此帳號名稱已存在，請重新輸入',
    errorMissingFields: '請輸入完整的帳號與密碼。',
    errorUserNotFound: '請先註冊',
    errorWrongPassword: '密碼錯誤',

    // Landing page nav
    landingNavPassenger: '我是乘客',
    landingNavDriver: '我是司機',
    landingNavAuth: '登入 / 註冊',

    // Landing hero
    landingHeroTitle: '計程車派遣系統',
    landingHeroSubtitle: '利用大數據分析，讓您不浪費時間等待。',
    landingHeroWhereTo: '去哪裡？',
    landingHeroPickupLabel: '上車地點',
    landingHeroPickupPlaceholder: '輸入上車地址',
    landingHeroPickupDefault: '目前位置',
    landingHeroDropoffLabel: '下車地點',
    landingHeroDropoffPlaceholder: '輸入目的地',
    landingHeroPriceExample: '預估金額：$150 - $180',
    landingHeroCta: '查看價格與車輛',

    // Landing how-it-works
    landingHowTitleTag: 'Simple Steps',
    landingHowTitle: '如何使用 SmartDispatch？',
    landingHowSubtitle: '簡單三步驟，體驗 AI 賦能的紐約出行服務',
    landingHowStep1Title: '1. 設定目的地',
    landingHowStep1Desc:
      '輸入您的上車點與下車位置，系統將自動估算最佳路徑與透明報價。',
    landingHowStep2Title: '2. AI 智慧媒合',
    landingHowStep2Desc:
      '我們的 AI 演算法會在毫秒內分析全紐約路況，為您指派最快抵達的車輛。',
    landingHowStep3Title: '3. 安心抵達',
    landingHowStep3Desc:
      '即時追蹤司機位置，享受安全舒適的旅程，並在抵達後輕鬆支付。',
    landingHowCta: '立即開始叫車',

    // Landing driver section
    landingDriverBadge: '司機專屬',
    landingDriverTitleLine1: '有預測需求指數',
    landingDriverTitleLine2: '不讓你白跑一趟。',
    landingDriverIntro: '我們的 APP 內建 AI 預測分數系統：',
    landingDriverFeature1Title: ' 熱點預測地圖',
    landingDriverFeature1Desc:
      '地圖顏色深淺代表需求強度，直接導航至高分區域。',
    landingDriverFeature2Title: ' 獲利分數 (Score)',
    landingDriverFeature2Desc:
      '我們會為每條路線打分數，跟著高分走，空車率降低 30%。',
    landingDriverCta: '加入司機行列',

    // Landing footer
    landingFooterTitle: '立即體驗智慧派遣',
    landingFooterIos: '🍎 iOS 下載',
    landingFooterAndroid: '🤖 Android 下載',
    landingFooterCopyright:
      '© 2025 SmartDispatch Project. Department of Computer Science.',
  },

  en: {
    appTitle: 'NY Taxi Demo',
    language: 'Language',
    passengerMode: 'Passenger',
    driverMode: 'Driver',

    currentPassengerLabel: 'Passenger:',
    currentDriverLabel: 'Driver:',
    notLoggedIn: 'Not logged in',
    driverPrefix: 'Driver: ',
    passengerPrefix: 'Passenger: ',

    backHome: 'Home',
    startVehicleSim: 'Start vehicle simulation',
    stopVehicleSim: 'Stop vehicle simulation',

    pickupPlaceholder: 'Pickup (e.g., Times Square)',
    dropoffPlaceholder: 'Dropoff (e.g., Central Park)',

    stopLabel: 'Stop',
    stopPlaceholder: 'Enter stop location',
    addStop: '+ Add stop',
    removeStop: 'Remove stop',

    viewPriceAndCars: 'View prices & vehicles',
    estimatedDistancePrefix: 'Estimated distance:',
    distanceKmUnit: 'km',

    ordersTitlePassenger: 'My Orders',
    ordersTitleDriver: 'Pending Orders',
    refresh: 'Refresh',
    loading: 'Loading…',

    driverStatusLabel: 'Status: ',
    driverStatusIdle: 'Idle',
    driverStatusBusy: 'Busy',
    pickupMarkerTitle: 'Pickup',
    dropoffMarkerTitle: 'Dropoff',
    stopMarkerTitle: 'Stop',

    needPickupDropoff: 'Please enter pickup and dropoff locations.',
    needLoginPassenger: 'Please log in as a passenger first.',
    needLoginDriver: 'Please log in as a driver first.',
    needPriceFirst: 'Please click "View prices & vehicles" first.',
    needCoordsPrepared:
      'Coordinates not ready yet. Please click "View prices & vehicles" again.',
    cannotFindPickupOrDropoff:
      'Cannot find pickup or dropoff. Please check the addresses.',
    cannotFindStop:
      'Cannot find one of the stops. Please check the address.',
    tripTooFar: 'Trip is too long. Please choose closer locations.',
    networkError: 'Unable to connect to server. Please try again later.',
    cannotConnectServer:
      'Unable to connect to server. Please try again later.',
    createOrderFailed: 'Failed to create order. Please try again.',
    acceptOrderFailed: 'Failed to accept order. Please try again.',
    attachDriverFailed: 'Failed to create driver vehicle. Please try again.',
    driverVehicleNotAttached:
      'Driver vehicle is not attached yet. Please re-login as driver.',

    authTitle: 'SmartDispatch Account',
    login: 'Login',
    register: 'Register',
    registerNow: 'Sign up now',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    usernamePlaceholder: 'Choose a login name',
    passwordPlaceholder: 'At least 6 characters',
    roleLabel: 'Role',
    rolePassenger: 'Passenger',
    roleDriver: 'Driver',
    carTypeLabel: 'Vehicle type',
    carTypeYellow: 'Yellow Taxi',
    carTypeGreen: 'Green Taxi',
    carTypeFhv: 'FHV (For-hire vehicle)',
    selectCarTypeHint: 'Please select a vehicle type',
    loginFailed: 'Login failed',
    registerFailed: 'Registration failed',

    // legacy keys
    auth_loginFailed: 'Incorrect password!',
    auth_registerFailed: 'This username is already taken!',

    // Error mapping
    errorUsernameTaken: 'This username already exists. Please try again.',
    errorMissingFields: 'Please enter both username and password.',
    errorUserNotFound: 'Please sign up first.',
    errorWrongPassword: 'Wrong password.',

    landingNavPassenger: 'I am a rider',
    landingNavDriver: 'I am a driver',
    landingNavAuth: 'Login / Sign up',

    landingHeroTitle: 'Taxi Dispatch System',
    landingHeroSubtitle:
      'Use data analytics so you do not waste time waiting.',
    landingHeroWhereTo: 'Where to?',
    landingHeroPickupLabel: 'Pickup location',
    landingHeroPickupPlaceholder: 'Enter pickup address',
    landingHeroPickupDefault: 'Current location',
    landingHeroDropoffLabel: 'Dropoff location',
    landingHeroDropoffPlaceholder: 'Enter destination',
    landingHeroPriceExample: 'Estimated fare: $150 – $180',
    landingHeroCta: 'View prices & vehicles',

    landingHowTitleTag: 'Simple Steps',
    landingHowTitle: 'How to use SmartDispatch?',
    landingHowSubtitle:
      'Three simple steps to experience AI-powered New York rides.',

    landingHowStep1Title: '1. Set your destination',
    landingHowStep1Desc:
      'Enter pickup and dropoff, and we estimate the best route and transparent price.',
    landingHowStep2Title: '2. AI smart matching',
    landingHowStep2Desc:
      'Our algorithm analyzes NYC traffic in milliseconds and assigns the fastest driver.',
    landingHowStep3Title: '3. Arrive with peace of mind',
    landingHowStep3Desc:
      'Track your driver in real time, enjoy a safe trip, and pay effortlessly at arrival.',
    landingHowCta: 'Start booking now',

    landingDriverBadge: 'For drivers',
    landingDriverTitleLine1: 'Demand prediction score',
    landingDriverTitleLine2: 'No more wasted empty trips.',
    landingDriverIntro:
      'Our app includes an AI demand prediction scoring system:',
    landingDriverFeature1Title: ' Hotspot heatmap',
    landingDriverFeature1Desc:
      'Map colors represent demand strength, guiding you directly to high-score zones.',
    landingDriverFeature2Title: ' Profit score',
    landingDriverFeature2Desc:
      'We score every route. Follow high-score routes and cut empty miles by 30%.',
    landingDriverCta: 'Join as a driver',

    landingFooterTitle: 'Experience smart dispatch now',
    landingFooterIos: '🍎 Download for iOS',
    landingFooterAndroid: '🤖 Download for Android',
    landingFooterCopyright:
      '© 2025 SmartDispatch Project. Department of Computer Science.',
  },

  ko: {
    appTitle: 'NY Taxi Demo',
    language: '언어',
    passengerMode: '승객 모드',
    driverMode: '기사 모드',

    currentPassengerLabel: '현재 승객:',
    currentDriverLabel: '현재 기사:',
    notLoggedIn: '로그인 안 됨',
    driverPrefix: '기사: ',
    passengerPrefix: '승객: ',

    backHome: '홈으로',
    startVehicleSim: '차량 시뮬레이션 시작',
    stopVehicleSim: '차량 시뮬레이션 중지',

    pickupPlaceholder: '승차 위치 (예: Times Square)',
    dropoffPlaceholder: '하차 위치 (예: Central Park)',

    stopLabel: '경유지',
    stopPlaceholder: '경유지 주소를 입력',
    addStop: '+ 경유지 추가',
    removeStop: '경유지 삭제',

    viewPriceAndCars: '요금 및 차량 보기',
    estimatedDistancePrefix: '예상 거리:',
    distanceKmUnit: 'km',

    ordersTitlePassenger: '내 주문',
    ordersTitleDriver: '대기 주문',
    refresh: '새로 고침',
    loading: '업데이트 중…',

    driverStatusLabel: '상태: ',
    driverStatusIdle: '대기',
    driverStatusBusy: '운행 중',
    pickupMarkerTitle: '승차 지점',
    dropoffMarkerTitle: '하차 지점',
    stopMarkerTitle: '경유지',

    needPickupDropoff: '승차 및 하차 위치를 입력하세요.',
    needLoginPassenger: '먼저 승객으로 로그인하세요.',
    needLoginDriver: '먼저 기사로 로그인하세요.',
    needPriceFirst: '"요금 및 차량 보기" 버튼을 먼저 누르세요.',
    needCoordsPrepared:
      '좌표가 아직 준비되지 않았습니다. 다시 시도하세요.',
    cannotFindPickupOrDropoff:
      '승차 또는 하차 위치를 찾을 수 없습니다.',
    cannotFindStop: '경유지 중 하나를 찾을 수 없습니다.',
    tripTooFar: '거리가 너무 멉니다. 다시 설정해 주세요.',
    networkError: '서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
    cannotConnectServer:
      '서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
    createOrderFailed: '주문 생성 실패. 다시 시도해 주세요.',
    acceptOrderFailed: '배차 수락 실패. 다시 시도해 주세요.',
    attachDriverFailed: '기사 차량을 생성할 수 없습니다.',
    driverVehicleNotAttached:
      '기사 차량이 아직 연결되지 않았습니다. 다시 로그인해 주세요.',

    authTitle: 'SmartDispatch 계정',
    login: '로그인',
    register: '회원가입',
    registerNow: '지금 가입',
    usernameLabel: '아이디',
    passwordLabel: '비밀번호',
    usernamePlaceholder: '로그인 아이디를 입력',
    passwordPlaceholder: '최소 6자',
    roleLabel: '역할',
    rolePassenger: '승객',
    roleDriver: '기사',
    carTypeLabel: '차량 종류',
    carTypeYellow: 'Yellow 택시',
    carTypeGreen: 'Green 택시',
    carTypeFhv: 'FHV (대절 차량)',
    selectCarTypeHint: '차량 종류를 선택하세요',
    loginFailed: '로그인 실패',
    registerFailed: '회원가입 실패',

    // legacy keys
    auth_loginFailed: '비밀번호가 잘못되었습니다!',
    auth_registerFailed: '이미 사용 중인 아이디입니다!',

    // errors
    errorUsernameTaken: '이미 존재하는 아이디입니다. 다시 입력해 주세요.',
    errorMissingFields: '아이디와 비밀번호를 모두 입력하세요.',
    errorUserNotFound: '먼저 회원가입해 주세요.',
    errorWrongPassword: '비밀번호가 올바르지 않습니다.',

    landingNavPassenger: '저는 승객입니다',
    landingNavDriver: '저는 기사입니다',
    landingNavAuth: '로그인 / 회원가입',

    landingHeroTitle: '택시 배차 시스템',
    landingHeroSubtitle:
      '데이터 분석으로 기다리는 시간을 줄여 드립니다.',
    landingHeroWhereTo: '어디로 가세요?',
    landingHeroPickupLabel: '승차 위치',
    landingHeroPickupPlaceholder: '승차 주소를 입력',
    landingHeroPickupDefault: '현재 위치',
    landingHeroDropoffLabel: '하차 위치',
    landingHeroDropoffPlaceholder: '목적지를 입력',
    landingHeroPriceExample: '예상 요금: $150 ~ $180',
    landingHeroCta: '요금 및 차량 보기',

    landingHowTitleTag: 'Simple Steps',
    landingHowTitle: 'SmartDispatch 사용 방법',
    landingHowSubtitle:
      '세 단계만으로 AI 기반 뉴욕 택시 서비스를 경험해 보세요.',

    landingHowStep1Title: '1. 목적지 설정',
    landingHowStep1Desc:
      '승차 지점과 하차 위치를 입력하면 최적 경로와 투명한 요금을 계산합니다.',
    landingHowStep2Title: '2. AI 스마트 배차',
    landingHowStep2Desc:
      'AI 알고리즘이 뉴욕 교통 상황을 분석해 가장 빨리 올 차량을 배차합니다.',
    landingHowStep3Title: '3. 안심 도착',
    landingHowStep3Desc:
      '실시간으로 기사 위치를 확인하며 안전하고 편안한 이동을 즐기세요.',
    landingHowCta: '지금 바로 호출하기',

    landingDriverBadge: '기사 전용',
    landingDriverTitleLine1: '수요 예측 지수로',
    landingDriverTitleLine2: '헛운행을 줄여 드립니다.',
    landingDriverIntro: '앱에는 AI 수요 예측 점수 시스템이 내장되어 있습니다:',
    landingDriverFeature1Title: ' 수요 핫스팟 지도',
    landingDriverFeature1Desc:
      '지도 색으로 수요 강도를 표시해 고수요 지역으로 바로 안내합니다.',
    landingDriverFeature2Title: ' 수익 점수 (Score)',
    landingDriverFeature2Desc:
      '각 노선에 점수를 매겨 높은 점수 위주로 운행하면 공차율이 30% 감소합니다.',
    landingDriverCta: '기사로 참여하기',

    landingFooterTitle: '지금 바로 스마트 배차를 경험해 보세요',
    landingFooterIos: '🍎 iOS 다운로드',
    landingFooterAndroid: '🤖 Android 다운로드',
    landingFooterCopyright:
      '© 2025 SmartDispatch Project. Department of Computer Science.',
  },

  ja: {
    appTitle: 'NY Taxi Demo',
    language: '言語',
    passengerMode: '乗客モード',
    driverMode: 'ドライバーモード',

    currentPassengerLabel: '現在の乗客：',
    currentDriverLabel: '現在のドライバー：',
    notLoggedIn: '未ログイン',
    driverPrefix: 'ドライバー：',
    passengerPrefix: '乗客：',

    backHome: 'ホームへ戻る',
    startVehicleSim: '車両シミュレーション開始',
    stopVehicleSim: '車両シミュレーション停止',

    pickupPlaceholder: '乗車場所（例：Times Square）',
    dropoffPlaceholder: '降車場所（例：Central Park）',

    stopLabel: '経由地',
    stopPlaceholder: '経由地を入力',
    addStop: '＋ 経由地を追加',
    removeStop: '経由地を削除',

    viewPriceAndCars: '料金と車両を表示',
    estimatedDistancePrefix: '推定距離：',
    distanceKmUnit: 'km',

    ordersTitlePassenger: '自分の注文',
    ordersTitleDriver: '待機中の注文',
    refresh: '更新',
    loading: '更新中…',

    driverStatusLabel: '状態：',
    driverStatusIdle: '待機',
    driverStatusBusy: '走行中',
    pickupMarkerTitle: '乗車地点',
    dropoffMarkerTitle: '降車地点',
    stopMarkerTitle: '経由地',

    needPickupDropoff: '乗車場所と降車場所を入力してください。',
    needLoginPassenger:
      'まず乗客としてログインしてください。',
    needLoginDriver:
      'まずドライバーとしてログインしてください。',
    needPriceFirst:
      '先に「料金と車両を表示」を押してください。',
    needCoordsPrepared:
      '座標がまだ準備できていません。もう一度試してください。',
    cannotFindPickupOrDropoff:
      '乗車または降車場所が見つかりません。住所を確認してください。',
    cannotFindStop:
      '経由地のいずれかが見つかりません。住所を確認してください。',
    tripTooFar: '距離が長すぎます。別の場所を選んでください。',
    networkError:
      'サーバーに接続できません。しばらくしてから再度お試しください。',
    cannotConnectServer:
      'サーバーに接続できません。後でもう一度お試しください。',
    createOrderFailed: '注文の作成に失敗しました。',
    acceptOrderFailed: '注文の受諾に失敗しました。',
    attachDriverFailed: 'ドライバー車両を作成できません。',
    driverVehicleNotAttached:
      'ドライバー車両がまだ紐付いていません。再ログインしてください。',

    authTitle: 'SmartDispatch アカウント',
    login: 'ログイン',
    register: '登録',
    registerNow: '今すぐ登録',
    usernameLabel: 'アカウント',
    passwordLabel: 'パスワード',
    usernamePlaceholder: 'ログイン名を設定',
    passwordPlaceholder: '6文字以上',
    roleLabel: '役割',
    rolePassenger: '乗客',
    roleDriver: 'ドライバー',
    carTypeLabel: '車種',
    carTypeYellow: 'Yellow タクシー',
    carTypeGreen: 'Green タクシー',
    carTypeFhv: 'FHV（ハイヤー）',
    selectCarTypeHint: '車種を選択してください',
    loginFailed: 'ログイン失敗',
    registerFailed: '登録失敗',

    // legacy keys
    auth_loginFailed: 'パスワードが正しくありません！',
    auth_registerFailed: 'このアカウント名は既に使用されています！',

    // errors
    errorUsernameTaken:
      'このアカウント名は既に存在します。再入力してください。',
    errorMissingFields: 'アカウントとパスワードを入力してください。',
    errorUserNotFound: 'まず登録してください。',
    errorWrongPassword: 'パスワードが違います。',

    landingNavPassenger: '乗客として利用',
    landingNavDriver: 'ドライバーとして利用',
    landingNavAuth: 'ログイン / 登録',

    landingHeroTitle: 'タクシー配車システム',
    landingHeroSubtitle:
      'データ分析で、待ち時間を無駄にしない移動体験を。',
    landingHeroWhereTo: 'どこへ行きますか？',
    landingHeroPickupLabel: '乗車場所',
    landingHeroPickupPlaceholder: '乗車場所を入力',
    landingHeroPickupDefault: '現在地',
    landingHeroDropoffLabel: '降車場所',
    landingHeroDropoffPlaceholder: '目的地を入力',
    landingHeroPriceExample: '推定料金：$150 ～ $180',
    landingHeroCta: '料金と車両を表示',

    landingHowTitleTag: 'Simple Steps',
    landingHowTitle: 'SmartDispatch の使い方',
    landingHowSubtitle: '3 ステップで AI 配車サービスを体験できます。',

    landingHowStep1Title: '1. 行き先を設定',
    landingHowStep1Desc:
      '乗車地点と降車地点を入力すると、最適ルートと料金を自動計算します。',
    landingHowStep2Title: '2. AI スマート配車',
    landingHowStep2Desc:
      'AI アルゴリズムがニューヨーク全体の交通を解析し、最速で到着できる車を配車します。',
    landingHowStep3Title: '3. 安心して到着',
    landingHowStep3Desc:
      'ドライバーの位置をリアルタイムで追跡し、安全で快適な移動をお楽しみください。',
    landingHowCta: '今すぐ配車を依頼',

    landingDriverBadge: 'ドライバー向け',
    landingDriverTitleLine1: '需要予測スコアで',
    landingDriverTitleLine2: 'ムダな空車走行を削減。',
    landingDriverIntro: 'アプリには AI 需要予測スコア機能を搭載：',
    landingDriverFeature1Title: ' ホットスポットマップ',
    landingDriverFeature1Desc:
      '地図の色で需要の強さを可視化し、稼げるエリアへ直接ナビします。',
    landingDriverFeature2Title: ' 収益スコア (Score)',
    landingDriverFeature2Desc:
      '各ルートにスコアを付け、高スコアのルートを走ることで空車率を 30% 削減します。',
    landingDriverCta: 'ドライバーとして参加',

    landingFooterTitle: 'スマート配車を今すぐ体験',
    landingFooterIos: '🍎 iOS ダウンロード',
    landingFooterAndroid: '🤖 Android ダウンロード',
    landingFooterCopyright:
      '© 2025 SmartDispatch Project. Department of Computer Science.',
  },
}

export const languages = Object.keys(messages)

export function t(lang, key) {
  const langCode = messages[lang] ? lang : 'zh'
  return messages[langCode][key] ?? messages.zh[key] ?? key
}
