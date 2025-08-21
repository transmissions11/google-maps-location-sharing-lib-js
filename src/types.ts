export interface CookieEntry {
  domain: string;
  flag: boolean;
  path: string;
  secure: boolean;
  expiry: number;
  name: string;
  value: string;
}

export interface Person {
  id: string | null;
  pictureUrl: string | null;
  fullName: string | null;
  nickname: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  timestamp: number | string | null;
  accuracy: any;
  address: string | null;
  countryCode: string | null;
  charging: boolean;
  batteryLevel: any;
  datetime: Date | null;
}
