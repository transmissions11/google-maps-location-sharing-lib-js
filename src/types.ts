export type RawPerson = any[];

export interface CookieEntry {
  domain: string;
  flag: boolean;
  path: string;
  secure: boolean;
  expiry: number;
  name: string;
  value: string;
}

export interface Coordinates {
  latitude: string | number | null;
  longitude: string | number | null;
}
