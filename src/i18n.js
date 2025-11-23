export const languages = ['zh', 'en', 'ko', 'ja']

export const translations = {
  zh: {
    appTitle: 'NY Taxi Demo',
    passengerMode: '乘客端',
    driverMode: '司機端',
    language: '語言',
    pickupPlaceholder: '上車地點（例如：Times Square）',
    dropoffPlaceholder: '目的地（例如：Central Park）',
    requestRide: '叫車',
    requesting: '送出中...',
    ordersTitlePassenger: '我的訂單',
    ordersTitleDriver: '待接訂單',
    noOrders: '目前沒有訂單',
    statusPending: '等待司機接單',
    statusAssigned: '已派遣司機',
    driverSelectLabel: '選擇目前司機',
    acceptOrder: '接單',
    refresh: '重新整理'
  },
  en: {
    appTitle: 'NY Taxi Demo',
    passengerMode: 'Passenger',
    driverMode: 'Driver',
    language: 'Language',
    pickupPlaceholder: 'Pickup (e.g. Times Square)',
    dropoffPlaceholder: 'Dropoff (e.g. Central Park)',
    requestRide: 'Request Ride',
    requesting: 'Requesting...',
    ordersTitlePassenger: 'My Orders',
    ordersTitleDriver: 'Pending Orders',
    noOrders: 'No orders yet',
    statusPending: 'Waiting for driver',
    statusAssigned: 'Driver assigned',
    driverSelectLabel: 'Select current driver',
    acceptOrder: 'Accept',
    refresh: 'Refresh'
  },
  ko: {
    appTitle: 'NY Taxi Demo',
    passengerMode: '승객',
    driverMode: '기사',
    language: '언어',
    pickupPlaceholder: '승차 위치 (예: 타임스퀘어)',
    dropoffPlaceholder: '목적지 (예: 센트럴파크)',
    requestRide: '호출하기',
    requesting: '요청 중...',
    ordersTitlePassenger: '나의 주문',
    ordersTitleDriver: '대기 중인 주문',
    noOrders: '주문이 없습니다',
    statusPending: '기사 대기 중',
    statusAssigned: '기사 배정됨',
    driverSelectLabel: '현재 기사 선택',
    acceptOrder: '수락',
    refresh: '새로고침'
  },
  ja: {
    appTitle: 'NY Taxi Demo',
    passengerMode: '乗客',
    driverMode: 'ドライバー',
    language: '言語',
    pickupPlaceholder: '乗車場所（例：タイムズスクエア）',
    dropoffPlaceholder: '目的地（例：セントラルパーク）',
    requestRide: '配車を呼ぶ',
    requesting: '送信中...',
    ordersTitlePassenger: '自分の注文',
    ordersTitleDriver: '未処理の注文',
    noOrders: '注文はありません',
    statusPending: 'ドライバー待ち',
    statusAssigned: 'ドライバー確定',
    driverSelectLabel: '現在のドライバーを選択',
    acceptOrder: '受注',
    refresh: '再読み込み'
  }
}

export function t(lang, key) {
  return translations[lang]?.[key] ?? key
}
