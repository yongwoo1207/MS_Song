export interface Country {
  code: string;
  name: string;
  flag: string;
  /** Service length shown on the waitlist */
  service: string;
  /** Only Korea has discharge rules and charts so far */
  available: boolean;
}

export const COUNTRIES: Country[] = [
  { code: "KR", name: "대한민국", flag: "🇰🇷", service: "18~21개월", available: true },
  { code: "SG", name: "싱가포르", flag: "🇸🇬", service: "NS 2년", available: false },
  { code: "IL", name: "이스라엘", flag: "🇮🇱", service: "2~3년", available: false },
  { code: "TW", name: "대만", flag: "🇹🇼", service: "1년", available: false },
  { code: "FI", name: "핀란드", flag: "🇫🇮", service: "6~12개월", available: false },
];

export const HOME_COUNTRY = COUNTRIES[0];
