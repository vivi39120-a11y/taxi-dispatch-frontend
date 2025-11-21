// src/i18n.js

// 下拉選單顯示的語言名稱
export const LANGS = {
  zh: '中文',
  en: 'English',
  ko: '한국어',
  ja: '日本語',
};

export const DEFAULT_LANG = 'zh';

// 各語言的文字
export const translations = {
  zh: {
    subtitle: '同一個前端模擬 乘客端 / 司機端 即時連動',
    riderTab: '乘客端',
    driverTab: '司機端',
    languageLabel: '語言',

    riderTitle: '乘客端',
    pickupLabel: '上車地點',
    dropoffLabel: '目的地',
    requestRideButton: '叫車',

    orderIdLabel: '訂單 ID',
    statusLabel: '狀態',
    waitingDriver: '等待司機接單…',
    driverAccepted: '司機已接單',

    etaPrefix: '距離約',
    etaUnitKm: 'km',
    etaSuffixMin: '預估 {min} 分鐘',

    driverTitle: '司機端',
    driverCurrent: '目前身分',
    driverPlate: '車牌',
    driverSwitchLabel: '切換司機',
    driverOrderListTitle: '可接的訂單',
    driverNoOrders: '目前沒有等待中的訂單',
    driverTakeThisOrder: '接這筆訂單',
    driverTripTitle: '目前行程',

    mapDriverLabel: '司機',
    statusAvailable: '待命中',
    statusOnTrip: '載客中',
    statusHeading: '前往乘客中',
    statusUnknown: '未知',
    mapSelected: '目前顯示中',
    status: '狀態',
  },

  en: {
    subtitle: 'Single front-end simulating rider & driver in real time',
    riderTab: 'Passenger',
    driverTab: 'Driver',
    languageLabel: 'Language',

    riderTitle: 'Passenger',
    pickupLabel: 'Pickup',
    dropoffLabel: 'Destination',
    requestRideButton: 'Request ride',

    orderIdLabel: 'Order ID',
    statusLabel: 'Status',
    waitingDriver: 'Waiting for driver…',
    driverAccepted: 'Driver accepted',

    etaPrefix: 'About',
    etaUnitKm: 'km',
    etaSuffixMin: 'ETA {min} min',

    driverTitle: 'Driver',
    driverCurrent: 'Current driver',
    driverPlate: 'Plate',
    driverSwitchLabel: 'Switch driver',
    driverOrderListTitle: 'Available orders',
    driverNoOrders: 'No pending orders',
    driverTakeThisOrder: 'Take this order',
    driverTripTitle: 'Current trip',

    mapDriverLabel: 'Driver',
    statusAvailable: 'Available',
    statusOnTrip: 'On trip',
    statusHeading: 'Heading to pickup',
    statusUnknown: 'Unknown',
    mapSelected: 'Selected',
    status: 'Status',
  },

  ko: {
    subtitle:
      '하나의 프론트엔드에서 승객 / 기사 화면을 실시간으로 시뮬레이션',
    riderTab: '승객',
    driverTab: '기사',
    languageLabel: '언어',

    riderTitle: '승객',
    pickupLabel: '승차 위치',
    dropoffLabel: '도착지',
    requestRideButton: '호출하기',

    orderIdLabel: '주문 ID',
    statusLabel: '상태',
    waitingDriver: '기사가 배차되기를 기다리는 중…',
    driverAccepted: '기사가 배차했습니다',

    etaPrefix: '거리 약',
    etaUnitKm: 'km',
    etaSuffixMin: '예상 {min}분',

    driverTitle: '기사',
    driverCurrent: '현재 기사',
    driverPlate: '차량 번호',
    driverSwitchLabel: '기사 변경',
    driverOrderListTitle: '배차 가능한 주문',
    driverNoOrders: '대기 중인 주문이 없습니다',
    driverTakeThisOrder: '이 주문 받기',
    driverTripTitle: '현재 운행',

    mapDriverLabel: '기사',
    statusAvailable: '대기',
    statusOnTrip: '운행 중',
    statusHeading: '승객에게 가는 중',
    statusUnknown: '알 수 없음',
    mapSelected: '선택됨',
    status: '상태',
  },

  ja: {
    subtitle:
      '1つのフロントエンドで 乗客 / ドライバー を同時にシミュレーション',
    riderTab: '乗客',
    driverTab: 'ドライバー',
    languageLabel: '言語',

    riderTitle: '乗客',
    pickupLabel: '乗車場所',
    dropoffLabel: '降車場所',
    requestRideButton: '配車を依頼',

    orderIdLabel: '注文 ID',
    statusLabel: 'ステータス',
    waitingDriver: 'ドライバーを探しています…',
    driverAccepted: 'ドライバーが受諾しました',

    etaPrefix: '距離 約',
    etaUnitKm: 'km',
    etaSuffixMin: '所要時間 約 {min} 分',

    driverTitle: 'ドライバー',
    driverCurrent: '現在のドライバー',
    driverPlate: 'ナンバー',
    driverSwitchLabel: 'ドライバー切替',
    driverOrderListTitle: '受けられる注文',
    driverNoOrders: '待機中の注文はありません',
    driverTakeThisOrder: 'この注文を受ける',
    driverTripTitle: '現在の走行',

    mapDriverLabel: 'ドライバー',
    statusAvailable: '待機中',
    statusOnTrip: '走行中',
    statusHeading: '迎車中',
    statusUnknown: '不明',
    mapSelected: '表示中',
    status: 'ステータス',
  },
};
